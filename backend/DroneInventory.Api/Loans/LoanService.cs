using DroneInventory.Api.Common;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Loans;

public class LoanService(DroneInventoryDbContext dbContext, TimeProvider timeProvider)
{
    public async Task<ServiceResult<IReadOnlyList<LoanResponse>>> ListAsync(LoanStatus? status, CancellationToken cancellationToken)
    {
        if (status != LoanStatus.Active)
        {
            return ServiceResult<IReadOnlyList<LoanResponse>>.Invalid("Use status=Active to list loans.");
        }

        var loans = await dbContext.Loans
            .Where(loan => loan.Status == LoanStatus.Active)
            .OrderByDescending(loan => loan.LoanDate)
            .ThenByDescending(loan => loan.Id)
            .Select(loan => new LoanResponse(
                loan.Id,
                loan.DroneId,
                loan.Drone!.Name,
                loan.StudentGroupId,
                loan.StudentGroup!.Name,
                loan.Items.Where(item => item.Type == LoanItemType.Battery).Sum(item => item.Quantity),
                loan.Items.Where(item => item.Type == LoanItemType.Propeller).Sum(item => item.Quantity),
                loan.LoanDate,
                loan.ReturnDate,
                loan.Status))
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyList<LoanResponse>>.Success(loans);
    }

    public async Task<ServiceResult<LoanResponse>> CreateAsync(CreateLoanRequest request, CancellationToken cancellationToken)
    {
        if (request.DroneId is not { } droneId)
        {
            return ServiceResult<LoanResponse>.Invalid("A loan needs a drone.");
        }

        if (request.StudentGroupId is not { } studentGroupId)
        {
            return ServiceResult<LoanResponse>.Invalid("A loan needs a student group.");
        }

        var (items, itemError) = ReadItems(request.Items);
        if (itemError is not null)
        {
            return ServiceResult<LoanResponse>.Invalid(itemError);
        }

        var drone = await dbContext.Drones.FindAsync([droneId], cancellationToken);
        if (drone is null)
        {
            return ServiceResult<LoanResponse>.Invalid($"The drone with the id {droneId} does not exist.");
        }

        var studentGroup = await dbContext.StudentGroups.FindAsync([studentGroupId], cancellationToken);
        if (studentGroup is null)
        {
            return ServiceResult<LoanResponse>.Invalid($"The student group with the id {studentGroupId} does not exist.");
        }

        var isLoaned = await dbContext.Loans.AnyAsync(
            loan => loan.DroneId == drone.Id && loan.Status == LoanStatus.Active,
            cancellationToken);
        if (isLoaned)
        {
            return AlreadyLoaned(drone);
        }

        var loan = new Loan
        {
            DroneId = drone.Id,
            StudentGroupId = studentGroup.Id,
            LoanDate = DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime),
            Status = LoanStatus.Active,
            Items = items,
        };
        dbContext.Loans.Add(loan);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.IsUniqueConstraintViolation())
        {
            // Another request loaned the drone after the check above.
            return AlreadyLoaned(drone);
        }

        return ServiceResult<LoanResponse>.Success(new LoanResponse(
            loan.Id,
            drone.Id,
            drone.Name,
            studentGroup.Id,
            studentGroup.Name,
            QuantityOf(loan, LoanItemType.Battery),
            QuantityOf(loan, LoanItemType.Propeller),
            loan.LoanDate,
            loan.ReturnDate,
            loan.Status));
    }

    private static (List<LoanItem> Items, string? Error) ReadItems(IReadOnlyList<CreateLoanItemRequest?>? requestedItems)
    {
        var items = new List<LoanItem>();

        foreach (var requestedItem in requestedItems ?? [])
        {
            if (requestedItem is null)
            {
                return (items, "The accessories contain an empty entry.");
            }

            // Enum.TryParse would also accept numbers such as "0", so only the exact names are allowed.
            if (!Enum.GetNames<LoanItemType>().Contains(requestedItem.Type))
            {
                return (items, $"\"{requestedItem.Type}\" is not an accessory type. Use Battery or Propeller.");
            }

            var type = Enum.Parse<LoanItemType>(requestedItem.Type!);

            if (requestedItem.Quantity is not { } quantity)
            {
                return (items, $"The accessory type {type} needs a quantity.");
            }

            if (quantity < 0)
            {
                return (items, "Accessory quantities must not be negative.");
            }

            if (items.Any(item => item.Type == type))
            {
                return (items, $"The accessory type {type} appears more than once.");
            }

            items.Add(new LoanItem { Type = type, Quantity = quantity });
        }

        return (items, null);
    }

    private static int QuantityOf(Loan loan, LoanItemType type) =>
        loan.Items.Where(item => item.Type == type).Sum(item => item.Quantity);

    private static ServiceResult<LoanResponse> AlreadyLoaned(Drone drone) =>
        ServiceResult<LoanResponse>.Conflict($"The drone \"{drone.Name}\" is already loaned.");
}
