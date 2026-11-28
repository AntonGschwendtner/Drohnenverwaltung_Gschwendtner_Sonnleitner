using DroneInventory.Api.Common;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Drones;

public class DroneService(DroneInventoryDbContext dbContext, TimeProvider timeProvider)
{
    public async Task<IReadOnlyList<DroneResponse>> ListAsync(CancellationToken cancellationToken) =>
        await dbContext.Drones
            .Where(drone => drone.DeletedAt == null)
            .OrderBy(drone => drone.Name)
            .Select(ToResponse())
            .ToListAsync(cancellationToken);

    /// <summary>One drone in the same shape as an item of the list (REQ-018).</summary>
    public async Task<ServiceResult<DroneResponse>> GetAsync(int id, CancellationToken cancellationToken)
    {
        var drone = await dbContext.Drones
            .Where(drone => drone.Id == id)
            .Select(ToResponse())
            .SingleOrDefaultAsync(cancellationToken);

        return drone is null
            ? ServiceResult<DroneResponse>.NotFound(Messages.UnknownDrone(id))
            : ServiceResult<DroneResponse>.Success(drone);
    }

    // The status follows from the active loan and is computed in the query.
    private System.Linq.Expressions.Expression<Func<Drone, DroneResponse>> ToResponse()
    {
        // The next reservation of today or later, for the hints in the drone list and the loan form (REQ-029).
        var today = Today();
        return drone => new DroneResponse(
            drone.Id,
            drone.Name,
            drone.DefectNote != null
                ? DroneStatus.Defective
                : dbContext.Loans.Any(loan => loan.DroneId == drone.Id && loan.Status == LoanStatus.Active)
                    ? DroneStatus.Loaned
                    : DroneStatus.Available,
            drone.Description,
            drone.DefectNote,
            drone.DeletedAt,
            dbContext.Reservations
                .Where(reservation => reservation.DroneId == drone.Id && reservation.Date >= today)
                .OrderBy(reservation => reservation.Date)
                .Select(reservation => (DateOnly?)reservation.Date)
                .FirstOrDefault(),
            dbContext.Reservations
                .Where(reservation => reservation.DroneId == drone.Id && reservation.Date >= today)
                .OrderBy(reservation => reservation.Date)
                .Select(reservation => reservation.StudentGroup!.Name)
                .FirstOrDefault(),
            drone.DefectGroupName);
    }

    public async Task<ServiceResult<DroneResponse>> CreateAsync(CreateDroneRequest request, CancellationToken cancellationToken)
    {
        var (name, error) = await CheckNameAsync(request.Name, exceptId: null, cancellationToken);
        if (error is not null)
        {
            return error;
        }

        var drone = new Drone { Name = name, Description = request.Description ?? string.Empty };
        dbContext.Drones.Add(drone);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.IsUniqueConstraintViolation())
        {
            return NameAlreadyExists(name);
        }

        return ServiceResult<DroneResponse>.Success(
            new DroneResponse(drone.Id, drone.Name, DroneStatus.Available, drone.Description));
    }

    /// <summary>
    /// Changes name and description with the same rules as creating (REQ-015). The status stays as it is,
    /// because it follows from the loans.
    /// </summary>
    public async Task<ServiceResult<DroneResponse>> UpdateAsync(int id, UpdateDroneRequest request, CancellationToken cancellationToken)
    {
        var drone = await dbContext.Drones.FindAsync([id], cancellationToken);
        if (drone is null)
        {
            return ServiceResult<DroneResponse>.NotFound(Messages.UnknownDrone(id));
        }

        if (drone.DeletedAt is not null)
        {
            return ServiceResult<DroneResponse>.Conflict(Messages.DroneInTrash(drone.Name));
        }

        var (name, error) = await CheckNameAsync(request.Name, exceptId: id, cancellationToken);
        if (error is not null)
        {
            return error;
        }

        drone.Name = name;
        drone.Description = request.Description ?? string.Empty;

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.IsUniqueConstraintViolation())
        {
            return NameAlreadyExists(name);
        }

        // Read back with the same projection as the list, so the status follows the same rules.
        return await GetAsync(id, cancellationToken);
    }

    /// <summary>The longest defect description a drone accepts (REQ-024).</summary>
    public const int MaxDefectLength = 500;

    /// <summary>
    /// Reports a defect for a drone that is not loaned (REQ-024). A defect found during a loan is reported with
    /// the return. Reporting again replaces the description.
    /// </summary>
    public async Task<ServiceResult<DroneResponse>> ReportDefectAsync(
        int id,
        ReportDefectRequest request,
        CancellationToken cancellationToken)
    {
        var drone = await dbContext.Drones.FindAsync([id], cancellationToken);
        if (drone is null)
        {
            return ServiceResult<DroneResponse>.NotFound(Messages.UnknownDrone(id));
        }

        if (drone.DeletedAt is not null)
        {
            return ServiceResult<DroneResponse>.Conflict(Messages.DroneInTrash(drone.Name));
        }

        var description = request.Description?.Trim();
        if (string.IsNullOrEmpty(description))
        {
            return ServiceResult<DroneResponse>.Invalid(Messages.DefectNeedsDescription);
        }

        if (description.Length > MaxDefectLength)
        {
            return ServiceResult<DroneResponse>.Invalid(Messages.DefectTooLong(MaxDefectLength));
        }

        // The group that reports the defect is required; a group in the trash cannot report one (REQ-024).
        var groupName = request.StudentGroupId is { } groupId
            ? await dbContext.StudentGroups
                .Where(group => group.Id == groupId && group.DeletedAt == null)
                .Select(group => group.Name)
                .FirstOrDefaultAsync(cancellationToken)
            : null;
        if (groupName is null)
        {
            return ServiceResult<DroneResponse>.Invalid(Messages.DefectNeedsStudentGroup);
        }

        var isLoaned = await dbContext.Loans.AnyAsync(
            loan => loan.DroneId == id && loan.Status == LoanStatus.Active,
            cancellationToken);
        if (isLoaned)
        {
            return ServiceResult<DroneResponse>.Conflict(Messages.DefectWhileLoaned(drone.Name));
        }

        drone.DefectNote = description;
        drone.DefectGroupName = groupName;
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetAsync(id, cancellationToken);
    }

    /// <summary>Marks a defective drone as repaired; it is available again (REQ-024).</summary>
    public async Task<ServiceResult<DroneResponse>> RepairAsync(int id, CancellationToken cancellationToken)
    {
        var drone = await dbContext.Drones.FindAsync([id], cancellationToken);
        if (drone is null)
        {
            return ServiceResult<DroneResponse>.NotFound(Messages.UnknownDrone(id));
        }

        if (drone.DeletedAt is not null)
        {
            return ServiceResult<DroneResponse>.Conflict(Messages.DroneInTrash(drone.Name));
        }

        if (drone.DefectNote is null)
        {
            return ServiceResult<DroneResponse>.Conflict(Messages.DroneNotDefective(drone.Name));
        }

        drone.DefectNote = null;
        drone.DefectGroupName = null;
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetAsync(id, cancellationToken);
    }

    /// <summary>
    /// Moves a drone into the trash (REQ-034). It keeps its loans and can be restored. A loaned drone stays, so it can
    /// still be returned through the loan page.
    /// </summary>
    public async Task<ServiceResult<bool>> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        // The transaction takes the write lock first, so the check and the move see the same loans.
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var drone = await dbContext.Drones.FindAsync([id], cancellationToken);
        if (drone is null || drone.DeletedAt is not null)
        {
            return ServiceResult<bool>.NotFound(Messages.UnknownDrone(id));
        }

        if (await IsLoanedAsync(id, cancellationToken))
        {
            return ServiceResult<bool>.Conflict(Messages.DroneIsLoanedCannotDelete(drone.Name));
        }

        // A promised drone stays until the reservation is cancelled (decision of 2026-11-12).
        var today = Today();
        var reservedOn = await dbContext.Reservations
            .Where(reservation => reservation.DroneId == id && reservation.Date >= today)
            .OrderBy(reservation => reservation.Date)
            .Select(reservation => (DateOnly?)reservation.Date)
            .FirstOrDefaultAsync(cancellationToken);
        if (reservedOn is { } reservedDate)
        {
            return ServiceResult<bool>.Conflict(Messages.ReservedCannotDelete(drone.Name, reservedDate));
        }

        drone.DeletedAt = today;
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return ServiceResult<bool>.Success(true);
    }

    /// <summary>The drones in the trash, the most recently deleted first (REQ-034).</summary>
    public async Task<IReadOnlyList<TrashedDroneResponse>> ListTrashAsync(CancellationToken cancellationToken) =>
        await dbContext.Drones
            .Where(drone => drone.DeletedAt != null)
            .OrderByDescending(drone => drone.DeletedAt)
            .ThenBy(drone => drone.Name)
            .Select(drone => new TrashedDroneResponse(
                drone.Id,
                drone.Name,
                drone.DeletedAt!.Value,
                dbContext.Loans.Count(loan => loan.DroneId == drone.Id)))
            .ToListAsync(cancellationToken);

    /// <summary>Takes a drone out of the trash with its loans and its defect (REQ-034).</summary>
    public async Task<ServiceResult<DroneResponse>> RestoreAsync(int id, CancellationToken cancellationToken)
    {
        var drone = await dbContext.Drones.FindAsync([id], cancellationToken);
        if (drone is null)
        {
            return ServiceResult<DroneResponse>.NotFound(Messages.UnknownDrone(id));
        }

        if (drone.DeletedAt is null)
        {
            return ServiceResult<DroneResponse>.NotFound(Messages.DroneNotInTrash(drone.Name));
        }

        drone.DeletedAt = null;
        await dbContext.SaveChangesAsync(cancellationToken);

        return await GetAsync(id, cancellationToken);
    }

    /// <summary>
    /// Deletes a drone from the trash for good (REQ-034). With "keep" its loans stay in the history under the drone's
    /// name; with "delete" they are deleted too. Everything runs in one transaction, and a loaned drone stays.
    /// </summary>
    public async Task<ServiceResult<bool>> DeletePermanentlyAsync(int id, string? history, CancellationToken cancellationToken)
    {
        if (!HistoryChoice.IsValid(history))
        {
            return ServiceResult<bool>.Invalid(Messages.HistoryChoiceMissing);
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var drone = await dbContext.Drones.FindAsync([id], cancellationToken);
        if (drone is null)
        {
            return ServiceResult<bool>.NotFound(Messages.UnknownDrone(id));
        }

        if (drone.DeletedAt is null)
        {
            return ServiceResult<bool>.Conflict(Messages.DroneNotInTrash(drone.Name));
        }

        if (await IsLoanedAsync(id, cancellationToken))
        {
            return ServiceResult<bool>.Conflict(Messages.DroneIsLoanedCannotDelete(drone.Name));
        }

        var loansOfDrone = dbContext.Loans.Where(loan => loan.DroneId == id);
        if (history == HistoryChoice.Keep)
        {
            var name = drone.Name;
            await loansOfDrone.ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(loan => loan.FormerDroneName, name)
                    .SetProperty(loan => loan.DroneId, (int?)null),
                cancellationToken);
        }
        else
        {
            // The loan items go with their loans through the cascade of the database.
            await loansOfDrone.ExecuteDeleteAsync(cancellationToken);
        }

        dbContext.Drones.Remove(drone);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return ServiceResult<bool>.Success(true);
    }

    /// <summary>
    /// Empties the drone trash (REQ-034): every drone in it is deleted for good with the same history choice.
    /// A drone in the trash is never loaned, so all of them go.
    /// </summary>
    public async Task<ServiceResult<EmptyTrashResponse>> EmptyTrashAsync(string? history, CancellationToken cancellationToken)
    {
        if (!HistoryChoice.IsValid(history))
        {
            return ServiceResult<EmptyTrashResponse>.Invalid(Messages.HistoryChoiceMissing);
        }

        var ids = await dbContext.Drones
            .Where(drone => drone.DeletedAt != null)
            .Select(drone => drone.Id)
            .ToListAsync(cancellationToken);

        var deleted = 0;
        foreach (var id in ids)
        {
            var result = await DeletePermanentlyAsync(id, history, cancellationToken);
            if (result.Error is null)
            {
                deleted++;
            }
        }

        return ServiceResult<EmptyTrashResponse>.Success(new EmptyTrashResponse(deleted));
    }

    private Task<bool> IsLoanedAsync(int id, CancellationToken cancellationToken) =>
        dbContext.Loans.AnyAsync(loan => loan.DroneId == id && loan.Status == LoanStatus.Active, cancellationToken);

    private DateOnly Today() => DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime);

    /// <summary>The name is required and unique. When editing, the drone itself may keep its name.</summary>
    private async Task<(string Name, ServiceResult<DroneResponse>? Error)> CheckNameAsync(
        string? requestedName,
        int? exceptId,
        CancellationToken cancellationToken)
    {
        var name = requestedName?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            return (string.Empty, ServiceResult<DroneResponse>.Invalid(Messages.DroneNeedsName));
        }

        // The name of a drone in the trash stays taken, so a restore never collides (REQ-034).
        var takenBy = await dbContext.Drones
            .Where(drone => drone.Name == name && drone.Id != exceptId)
            .Select(drone => new { drone.DeletedAt })
            .FirstOrDefaultAsync(cancellationToken);

        if (takenBy is null)
        {
            return (name, null);
        }

        return takenBy.DeletedAt is null
            ? (name, NameAlreadyExists(name))
            : (name, ServiceResult<DroneResponse>.Conflict(Messages.DroneNameInTrash(name)));
    }

    private static ServiceResult<DroneResponse> NameAlreadyExists(string name) =>
        ServiceResult<DroneResponse>.Conflict(Messages.DroneNameExists(name));
}
