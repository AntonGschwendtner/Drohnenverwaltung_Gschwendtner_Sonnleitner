using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Data model of the return check and the defects (REQ-023, REQ-024).
/// </summary>
public sealed class DefectAndReturnedQuantityEntityTests : IDisposable
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");

    public DefectAndReturnedQuantityEntityTests() => _connection.Open();

    [Fact]
    public async Task Defect_and_returned_quantity_are_optional_and_stored()
    {
        await using var dbContext = CreateContext();
        await dbContext.Database.MigrateAsync();
        var drone = new Drone { Name = "TELLO-07" };
        var studentGroup = new StudentGroup { Name = "Group 3" };
        dbContext.AddRange(drone, studentGroup);
        await dbContext.SaveChangesAsync();
        dbContext.Loans.Add(new Loan
        {
            DroneId = drone.Id,
            StudentGroupId = studentGroup.Id,
            LoanDate = new DateOnly(2026, 8, 19),
            Items = [new LoanItem { Type = LoanItemType.Battery, Quantity = 4 }],
        });
        await dbContext.SaveChangesAsync();

        Assert.Null((await dbContext.Drones.SingleAsync()).DefectNote);
        Assert.Null((await dbContext.Set<LoanItem>().SingleAsync()).ReturnedQuantity);

        drone.DefectNote = "Motor 3 dreht nicht";
        (await dbContext.Set<LoanItem>().SingleAsync()).ReturnedQuantity = 3;
        await dbContext.SaveChangesAsync();
        dbContext.ChangeTracker.Clear();

        Assert.Equal("Motor 3 dreht nicht", (await dbContext.Drones.SingleAsync()).DefectNote);
        Assert.Equal(3, (await dbContext.Set<LoanItem>().SingleAsync()).ReturnedQuantity);
    }

    [Fact]
    public async Task Migration_marks_old_returns_as_complete()
    {
        await using var dbContext = CreateContext();
        var migrator = dbContext.GetService<IMigrator>();
        await migrator.MigrateAsync("AddLoanNoteAndDueDate");
        await dbContext.Database.ExecuteSqlRawAsync("""
            INSERT INTO Drones (Id, Name, Description) VALUES (1, 'TELLO-07', ''), (2, 'TELLO-08', '');
            INSERT INTO StudentGroups (Id, Name) VALUES (1, 'Group 3');
            INSERT INTO Loans (Id, DroneId, StudentGroupId, LoanDate, ReturnDate, Status) VALUES
                (1, 1, 1, '2026-08-01', '2026-08-05', 'Returned'),
                (2, 2, 1, '2026-08-19', NULL, 'Active');
            INSERT INTO LoanItems (Id, LoanId, Type, Quantity) VALUES
                (1, 1, 'Battery', 4), (2, 1, 'Propeller', 8), (3, 2, 'Battery', 2);
            """);

        await migrator.MigrateAsync();

        var returned = await dbContext.Database
            .SqlQueryRaw<int?>("SELECT ReturnedQuantity AS Value FROM LoanItems WHERE LoanId = 1 ORDER BY Id")
            .ToListAsync();
        var active = await dbContext.Database
            .SqlQueryRaw<int?>("SELECT ReturnedQuantity AS Value FROM LoanItems WHERE LoanId = 2")
            .SingleAsync();
        Assert.Equal([4, 8], returned);
        Assert.Null(active);
    }

    public void Dispose() => _connection.Dispose();

    private DroneInventoryDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<DroneInventoryDbContext>().UseSqlite(_connection).Options);
}
