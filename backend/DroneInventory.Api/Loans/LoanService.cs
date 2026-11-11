using System.Linq.Expressions;
using DroneInventory.Api.Common;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Loans;

public class LoanService(DroneInventoryDbContext dbContext, TimeProvider timeProvider)
{
    private static readonly Expression<Func<Loan, LoanResponse>> ToResponse = loan => new LoanResponse(
        loan.Id,
        loan.DroneId,
        loan.Drone!.Name,
        loan.StudentGroupId,
        loan.StudentGroup!.Name,
        loan.Items.Where(item => item.Type == LoanItemType.Battery).Sum(item => item.Quantity),
        loan.Items.Where(item => item.Type == LoanItemType.Propeller).Sum(item => item.Quantity),
        loan.LoanDate,
        loan.ReturnDate,
        loan.Status);

    public async Task<ServiceResult<IReadOnlyList<LoanResponse>>> ListAsync(LoanStatus? status, CancellationToken cancellationToken)
    {
        if (status is not { } requestedStatus)
        {
            return ServiceResult<IReadOnlyList<LoanResponse>>.Invalid(Messages.LoanStatusMissing);
        }

        var matchingLoans = dbContext.Loans.Where(loan => loan.Status == requestedStatus);

        var sortedLoans = requestedStatus == LoanStatus.Returned
            ? matchingLoans.OrderByDescending(loan => loan.ReturnDate).ThenByDescending(loan => loan.Id)
            : matchingLoans.OrderByDescending(loan => loan.LoanDate).ThenByDescending(loan => loan.Id);

        var loans = await sortedLoans
            .Select(ToResponse)
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyList<LoanResponse>>.Success(loans);
    }

    public async Task<ServiceResult<LoanResponse>> CreateAsync(CreateLoanRequest request, CancellationToken cancellationToken)
    {
        if (request.DroneId is not { } droneId)
        {
            return ServiceResult<LoanResponse>.Invalid(Messages.LoanNeedsDrone);
        }

        if (request.StudentGroupId is not { } studentGroupId)
        {
            return ServiceResult<LoanResponse>.Invalid(Messages.LoanNeedsStudentGroup);
        }

        var (items, itemError) = ReadItems(request.Items);
        if (itemError is not null)
        {
            return ServiceResult<LoanResponse>.Invalid(itemError);
        }

        var drone = await dbContext.Drones.FindAsync([droneId], cancellationToken);
        if (drone is null)
        {
            return ServiceResult<LoanResponse>.Invalid(Messages.UnknownDrone(droneId));
        }

        var studentGroup = await dbContext.StudentGroups.FindAsync([studentGroupId], cancellationToken);
        if (studentGroup is null)
        {
            return ServiceResult<LoanResponse>.Invalid(Messages.UnknownStudentGroup(studentGroupId));
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

    public async Task<ServiceResult<LoanResponse>> ReturnAsync(int id, CancellationToken cancellationToken)
    {
        DateOnly? returnDate = DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime);

        // One statement, so that of two returns at the same time only one changes the loan.
        var changedLoans = await dbContext.Loans
            .Where(loan => loan.Id == id && loan.Status == LoanStatus.Active)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(loan => loan.Status, LoanStatus.Returned)
                    .SetProperty(loan => loan.ReturnDate, returnDate),
                cancellationToken);

        var returnedLoan = await dbContext.Loans
            .Where(loan => loan.Id == id)
            .Select(ToResponse)
            .SingleOrDefaultAsync(cancellationToken);

        if (returnedLoan is null)
        {
            return ServiceResult<LoanResponse>.NotFound(Messages.UnknownLoan(id));
        }

        return changedLoans == 0
            ? ServiceResult<LoanResponse>.Conflict(Messages.LoanAlreadyReturned(id))
            : ServiceResult<LoanResponse>.Success(returnedLoan);
    }

    private static (List<LoanItem> Items, string? Error) ReadItems(IReadOnlyList<CreateLoanItemRequest?>? requestedItems)
    {
        var items = new List<LoanItem>();

        foreach (var requestedItem in requestedItems ?? [])
        {
            if (requestedItem is null)
            {
                return (items, Messages.EmptyLoanItem);
            }

            // Enum.TryParse would also accept numbers such as "0", so only the exact names are allowed.
            if (!Enum.GetNames<LoanItemType>().Contains(requestedItem.Type))
            {
                return (items, Messages.UnknownLoanItemType(requestedItem.Type));
            }

            var type = Enum.Parse<LoanItemType>(requestedItem.Type!);

            if (requestedItem.Quantity is not { } quantity)
            {
                return (items, Messages.LoanItemNeedsQuantity(type.ToString()));
            }

            if (quantity < 0)
            {
                return (items, Messages.NegativeQuantity);
            }

            if (items.Any(item => item.Type == type))
            {
                return (items, Messages.LoanItemTypeTwice(type.ToString()));
            }

            items.Add(new LoanItem { Type = type, Quantity = quantity });
        }

        return (items, null);
    }

    private static int QuantityOf(Loan loan, LoanItemType type) =>
        loan.Items.Where(item => item.Type == type).Sum(item => item.Quantity);

    private static ServiceResult<LoanResponse> AlreadyLoaned(Drone drone) =>
        ServiceResult<LoanResponse>.Conflict(Messages.DroneAlreadyLoaned(drone.Name));
}
