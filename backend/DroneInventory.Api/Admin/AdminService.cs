using DroneInventory.Api.Common;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Admin;

/// <summary>What the general reset does; every part is chosen on its own (REQ-038).</summary>
public sealed record ResetRequest(
    bool ReturnAllDrones = false,
    bool DeleteAllDrones = false,
    bool DeleteAllStudentGroups = false,
    bool DeleteHistory = false);

/// <summary>How much the reset changed, so the app can say it.</summary>
public sealed record ResetResponse(int ReturnedLoans, int DeletedDrones, int DeletedStudentGroups, int DeletedLoans);

/// <summary>
/// The general reset (REQ-038) and backup and restore of the whole database (REQ-039). Both act on all data at
/// once, so they run in one transaction or copy the database as a whole.
/// </summary>
public class AdminService(DroneInventoryDbContext dbContext, TimeProvider timeProvider)
{
    /// <summary>The largest backup file the restore accepts.</summary>
    public const long MaxBackupBytes = 50 * 1024 * 1024;

    private static readonly byte[] SqliteHeader = "SQLite format 3\0"u8.ToArray();

    /// <summary>
    /// Resets the chosen parts in this order: return all active loans, delete the history, delete all drones, delete
    /// all student groups. Deleting drones or groups keeps their returned loans in the history under their names, like
    /// "keep the history" in the trash; their active loans are deleted. Who wants the history gone chooses it too.
    /// </summary>
    public async Task<ServiceResult<ResetResponse>> ResetAsync(ResetRequest request, CancellationToken cancellationToken)
    {
        if (!(request.ReturnAllDrones || request.DeleteAllDrones || request.DeleteAllStudentGroups || request.DeleteHistory))
        {
            return ServiceResult<ResetResponse>.Invalid(Messages.ResetNothingChosen);
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        int returnedLoans = 0, deletedDrones = 0, deletedStudentGroups = 0, deletedLoans = 0;

        if (request.ReturnAllDrones)
        {
            var today = DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime);
            var activeLoanIds = dbContext.Loans.Where(loan => loan.Status == LoanStatus.Active).Select(loan => loan.Id);

            // Everything that was loaned counts as returned, as with a return without quantities (REQ-023).
            await dbContext.Set<LoanItem>()
                .Where(item => activeLoanIds.Contains(item.LoanId))
                .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.ReturnedQuantity, item => item.Quantity), cancellationToken);
            returnedLoans = await dbContext.Loans
                .Where(loan => loan.Status == LoanStatus.Active)
                .ExecuteUpdateAsync(
                    setters => setters
                        .SetProperty(loan => loan.Status, LoanStatus.Returned)
                        .SetProperty(loan => loan.ReturnDate, today),
                    cancellationToken);
        }

        if (request.DeleteHistory)
        {
            deletedLoans += await dbContext.Loans
                .Where(loan => loan.Status == LoanStatus.Returned)
                .ExecuteDeleteAsync(cancellationToken);
        }

        if (request.DeleteAllDrones)
        {
            deletedLoans += await dbContext.Loans
                .Where(loan => loan.Status == LoanStatus.Active && loan.DroneId != null)
                .ExecuteDeleteAsync(cancellationToken);
            await dbContext.Loans
                .Where(loan => loan.DroneId != null)
                .ExecuteUpdateAsync(
                    setters => setters
                        .SetProperty(loan => loan.FormerDroneName, loan => dbContext.Drones.Where(drone => drone.Id == loan.DroneId).Select(drone => drone.Name).FirstOrDefault())
                        .SetProperty(loan => loan.DroneId, (int?)null),
                    cancellationToken);
            deletedDrones = await dbContext.Drones.ExecuteDeleteAsync(cancellationToken);
        }

        if (request.DeleteAllStudentGroups)
        {
            deletedLoans += await dbContext.Loans
                .Where(loan => loan.Status == LoanStatus.Active && loan.StudentGroupId != null)
                .ExecuteDeleteAsync(cancellationToken);
            await dbContext.Loans
                .Where(loan => loan.StudentGroupId != null)
                .ExecuteUpdateAsync(
                    setters => setters
                        .SetProperty(loan => loan.FormerStudentGroupName, loan => dbContext.StudentGroups.Where(group => group.Id == loan.StudentGroupId).Select(group => group.Name).FirstOrDefault())
                        .SetProperty(loan => loan.StudentGroupId, (int?)null),
                    cancellationToken);

            // The members go with their groups through the cascade of the database.
            deletedStudentGroups = await dbContext.StudentGroups.ExecuteDeleteAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return ServiceResult<ResetResponse>.Success(new ResetResponse(returnedLoans, deletedDrones, deletedStudentGroups, deletedLoans));
    }

    /// <summary>A consistent copy of the whole database as a SQLite file (REQ-039).</summary>
    public async Task<byte[]> BackupAsync(CancellationToken cancellationToken)
    {
        var file = Path.Combine(Path.GetTempPath(), $"drone-backup-{Guid.NewGuid():N}.db");
        try
        {
            await using (var source = new SqliteConnection(dbContext.Database.GetConnectionString()))
            await using (var target = new SqliteConnection($"Data Source={file};Pooling=False"))
            {
                await source.OpenAsync(cancellationToken);
                await target.OpenAsync(cancellationToken);
                source.BackupDatabase(target);
            }

            return await File.ReadAllBytesAsync(file, cancellationToken);
        }
        finally
        {
            File.Delete(file);
        }
    }

    /// <summary>
    /// Replaces all data with a backup (REQ-039). Only a backup of this application is accepted: a SQLite file with the
    /// migration history of this application and no migration this version does not know. An older backup is
    /// brought up to date after the restore.
    /// </summary>
    public async Task<ServiceResult<bool>> RestoreAsync(Stream backup, long length, CancellationToken cancellationToken)
    {
        if (length is <= 0 or > MaxBackupBytes)
        {
            return ServiceResult<bool>.Invalid(Messages.BackupInvalid);
        }

        var file = Path.Combine(Path.GetTempPath(), $"drone-restore-{Guid.NewGuid():N}.db");
        try
        {
            await using (var stream = File.Create(file))
            {
                await backup.CopyToAsync(stream, cancellationToken);
            }

            var header = new byte[SqliteHeader.Length];
            await using (var stream = File.OpenRead(file))
            {
                if (await stream.ReadAsync(header, cancellationToken) != header.Length || !header.SequenceEqual(SqliteHeader))
                {
                    return ServiceResult<bool>.Invalid(Messages.BackupInvalid);
                }
            }

            await using var source = new SqliteConnection($"Data Source={file};Mode=ReadOnly;Pooling=False");
            await source.OpenAsync(cancellationToken);

            var migrations = await ReadMigrationsAsync(source, cancellationToken);
            if (migrations is null || migrations.Count == 0)
            {
                return ServiceResult<bool>.Invalid(Messages.BackupInvalid);
            }

            var known = dbContext.Database.GetMigrations().ToHashSet();
            if (migrations.Any(migration => !known.Contains(migration)))
            {
                return ServiceResult<bool>.Invalid(Messages.BackupNewer);
            }

            // A damaged file or one without the main tables never replaces the live data.
            if (!await IsIntactAsync(source, cancellationToken))
            {
                return ServiceResult<bool>.Invalid(Messages.BackupInvalid);
            }

            await using (var target = new SqliteConnection(dbContext.Database.GetConnectionString()))
            {
                await target.OpenAsync(cancellationToken);
                source.BackupDatabase(target);
            }

            // A backup of an older version gets the newer tables and columns.
            await dbContext.Database.MigrateAsync(cancellationToken);
            return ServiceResult<bool>.Success(true);
        }
        catch (SqliteException)
        {
            return ServiceResult<bool>.Invalid(Messages.BackupInvalid);
        }
        finally
        {
            SqliteConnection.ClearAllPools();
            File.Delete(file);
        }
    }

    private static async Task<bool> IsIntactAsync(SqliteConnection connection, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "PRAGMA quick_check";
        if (await command.ExecuteScalarAsync(cancellationToken) is not "ok")
        {
            return false;
        }

        command.CommandText =
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name IN ('Drones', 'StudentGroups', 'Loans', 'LoanItems')";
        return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken)) == 4;
    }

    private static async Task<List<string>?> ReadMigrationsAsync(SqliteConnection connection, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__EFMigrationsHistory'";
        if (await command.ExecuteScalarAsync(cancellationToken) is null)
        {
            return null;
        }

        command.CommandText = "SELECT MigrationId FROM __EFMigrationsHistory";
        var migrations = new List<string>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            migrations.Add(reader.GetString(0));
        }

        return migrations;
    }
}
