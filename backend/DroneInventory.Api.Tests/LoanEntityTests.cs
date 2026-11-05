using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

public sealed class LoanEntityTests : IDisposable
{
    private const int SqliteConstraintError = 19;
    private static readonly DateOnly LoanDate = new(2026, 8, 19);

    private readonly DroneInventoryApiFactory _factory = new();

    [Fact]
    public async Task Database_refuses_a_second_active_loan_for_one_drone()
    {
        var (droneId, studentGroupId) = await SeedDroneAndStudentGroupAsync();
        await SaveLoanAsync(droneId, studentGroupId, LoanStatus.Active);

        var exception = await Assert.ThrowsAsync<DbUpdateException>(
            () => SaveLoanAsync(droneId, studentGroupId, LoanStatus.Active));

        var sqliteException = Assert.IsType<SqliteException>(exception.InnerException);
        Assert.Equal(SqliteConstraintError, sqliteException.SqliteErrorCode);
        Assert.Contains("Loans.DroneId", sqliteException.Message);
    }

    [Fact]
    public async Task Returned_loan_does_not_block_a_new_active_loan()
    {
        var (droneId, studentGroupId) = await SeedDroneAndStudentGroupAsync();
        await SaveLoanAsync(droneId, studentGroupId, LoanStatus.Returned);
        await SaveLoanAsync(droneId, studentGroupId, LoanStatus.Returned);

        await SaveLoanAsync(droneId, studentGroupId, LoanStatus.Active);

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        Assert.Equal(3, await dbContext.Loans.CountAsync());
        Assert.Equal(1, await dbContext.Loans.CountAsync(loan => loan.Status == LoanStatus.Active));
    }

    [Fact]
    public async Task Different_drones_can_be_loaned_at_the_same_time()
    {
        var (droneId, studentGroupId) = await SeedDroneAndStudentGroupAsync();
        var (otherDroneId, _) = await SeedDroneAndStudentGroupAsync("TELLO-08", "Group 4");
        await SaveLoanAsync(droneId, studentGroupId, LoanStatus.Active);

        await SaveLoanAsync(otherDroneId, studentGroupId, LoanStatus.Active);

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        Assert.Equal(2, await dbContext.Loans.CountAsync(loan => loan.Status == LoanStatus.Active));
    }

    [Fact]
    public async Task Loan_is_stored_with_its_items_and_readable_values()
    {
        var (droneId, studentGroupId) = await SeedDroneAndStudentGroupAsync();
        await SaveLoanAsync(
            droneId,
            studentGroupId,
            LoanStatus.Active,
            new LoanItem { Type = LoanItemType.Battery, Quantity = 4 },
            new LoanItem { Type = LoanItemType.Propeller, Quantity = 8 });

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        var loan = await dbContext.Loans.Include(l => l.Items).SingleAsync();

        Assert.Equal(LoanDate, loan.LoanDate);
        Assert.Null(loan.ReturnDate);
        Assert.Equal(4, loan.Items.Single(item => item.Type == LoanItemType.Battery).Quantity);
        Assert.Equal(8, loan.Items.Single(item => item.Type == LoanItemType.Propeller).Quantity);

        Assert.Equal(
            "Active",
            await dbContext.Database.SqlQueryRaw<string>("SELECT Status AS Value FROM Loans").SingleAsync());
        Assert.Equal(
            ["Battery", "Propeller"],
            await dbContext.Database.SqlQueryRaw<string>("SELECT Type AS Value FROM LoanItems ORDER BY Type").ToListAsync());
    }

    [Fact]
    public async Task Database_refuses_a_loan_for_an_unknown_drone()
    {
        var (_, studentGroupId) = await SeedDroneAndStudentGroupAsync();

        var exception = await Assert.ThrowsAsync<DbUpdateException>(
            () => SaveLoanAsync(droneId: 999, studentGroupId, LoanStatus.Active));

        var sqliteException = Assert.IsType<SqliteException>(exception.InnerException);
        Assert.Equal(SqliteConstraintError, sqliteException.SqliteErrorCode);
    }

    public void Dispose() => _factory.Dispose();

    private async Task<(int DroneId, int StudentGroupId)> SeedDroneAndStudentGroupAsync(
        string droneName = "TELLO-07",
        string studentGroupName = "Group 3")
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        var drone = new Drone { Name = droneName };
        var studentGroup = new StudentGroup { Name = studentGroupName };
        dbContext.AddRange(drone, studentGroup);
        await dbContext.SaveChangesAsync();
        return (drone.Id, studentGroup.Id);
    }

    private async Task SaveLoanAsync(int droneId, int studentGroupId, LoanStatus status, params LoanItem[] items)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        dbContext.Loans.Add(new Loan
        {
            DroneId = droneId,
            StudentGroupId = studentGroupId,
            LoanDate = LoanDate,
            ReturnDate = status == LoanStatus.Returned ? LoanDate : null,
            Status = status,
            Items = [.. items],
        });
        await dbContext.SaveChangesAsync();
    }
}
