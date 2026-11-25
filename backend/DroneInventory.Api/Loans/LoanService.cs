using System.Linq.Expressions;
using DroneInventory.Api.Common;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using DroneInventory.Api.Drones;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Loans;

public class LoanService(DroneInventoryDbContext dbContext, TimeProvider timeProvider)
{
    /// <summary>An active loan running longer than this many full days is long-running (REQ-012).</summary>
    public const int LongRunningAfterDays = 7;

    /// <summary>The longest note a loan accepts (REQ-021).</summary>
    public const int MaxNoteLength = 500;

    private static readonly Expression<Func<Loan, LoanResponse>> ToResponse = loan => new LoanResponse(
        loan.Id,
        loan.DroneId,
        // The current name of the drone; the kept name once the drone was deleted for good (REQ-034).
        loan.Drone != null ? loan.Drone.Name : loan.FormerDroneName ?? string.Empty,
        loan.StudentGroupId,
        // The current name of the group; the kept name once the group was deleted for good (REQ-033).
        loan.StudentGroup != null ? loan.StudentGroup.Name : loan.FormerStudentGroupName ?? string.Empty,
        loan.Items.Where(item => item.Type == LoanItemType.Battery).Sum(item => item.Quantity),
        loan.Items.Where(item => item.Type == LoanItemType.Propeller).Sum(item => item.Quantity),
        loan.LoanDate,
        loan.ReturnDate,
        loan.Status,
        loan.Note,
        loan.DueDate,
        loan.Items.Where(item => item.Type == LoanItemType.Battery)
            .Sum(item => item.Quantity - (item.ReturnedQuantity ?? item.Quantity)),
        loan.Items.Where(item => item.Type == LoanItemType.Propeller)
            .Sum(item => item.Quantity - (item.ReturnedQuantity ?? item.Quantity)));

    /// <summary>
    /// Lists loans by status, by drone or by student group (REQ-007, REQ-010, REQ-018, REQ-019). Without a drone
    /// or a group the status is required, so a client never loads every loan by accident.
    /// </summary>
    public async Task<ServiceResult<IReadOnlyList<LoanResponse>>> ListAsync(
        LoanStatus? status,
        int? droneId,
        int? studentGroupId,
        CancellationToken cancellationToken)
    {
        if (status is null && droneId is null && studentGroupId is null)
        {
            return ServiceResult<IReadOnlyList<LoanResponse>>.Invalid(Messages.LoanStatusMissing);
        }

        var matchingLoans = dbContext.Loans.AsQueryable();
        if (status is { } requestedStatus)
        {
            matchingLoans = matchingLoans.Where(loan => loan.Status == requestedStatus);
        }

        if (droneId is { } requestedDroneId)
        {
            matchingLoans = matchingLoans.Where(loan => loan.DroneId == requestedDroneId);
        }

        if (studentGroupId is { } requestedStudentGroupId)
        {
            matchingLoans = matchingLoans.Where(loan => loan.StudentGroupId == requestedStudentGroupId);
        }

        // Active loans first, then the newest return first; ties by the newer loan.
        var sortedLoans = matchingLoans
            .OrderBy(loan => loan.Status == LoanStatus.Active ? 0 : 1)
            .ThenByDescending(loan => loan.ReturnDate)
            .ThenByDescending(loan => loan.LoanDate)
            .ThenByDescending(loan => loan.Id);

        var loans = await sortedLoans
            .Select(ToResponse)
            .ToListAsync(cancellationToken);

        var today = Today();
        return ServiceResult<IReadOnlyList<LoanResponse>>.Success(loans.Select(loan => WithDuration(loan, today)).ToList());
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

        // A blank note is no note, so "no note" has one form in the database.
        var note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        if (note is { Length: > MaxNoteLength })
        {
            return ServiceResult<LoanResponse>.Invalid(Messages.NoteTooLong(MaxNoteLength));
        }

        // The loan date is today, so a planned return date before today lies before the loan date (REQ-022).
        var today = Today();
        if (request.DueDate is { } dueDate && dueDate < today)
        {
            return ServiceResult<LoanResponse>.Invalid(Messages.DueDateBeforeLoanDate);
        }

        var drone = await dbContext.Drones.FindAsync([droneId], cancellationToken);
        if (drone is null)
        {
            return ServiceResult<LoanResponse>.Invalid(Messages.UnknownDrone(droneId));
        }

        if (drone.DeletedAt is not null)
        {
            return ServiceResult<LoanResponse>.Conflict(Messages.DroneInTrash(drone.Name));
        }

        var studentGroup = await dbContext.StudentGroups.FindAsync([studentGroupId], cancellationToken);
        if (studentGroup is null)
        {
            return ServiceResult<LoanResponse>.Invalid(Messages.UnknownStudentGroup(studentGroupId));
        }

        if (studentGroup.DeletedAt is not null)
        {
            return ServiceResult<LoanResponse>.Conflict(Messages.StudentGroupInTrash(studentGroup.Name));
        }

        // A defective drone is not available and cannot be loaned until it is repaired (REQ-024).
        if (drone.DefectNote is not null)
        {
            return ServiceResult<LoanResponse>.Conflict(Messages.DroneIsDefective(drone.Name));
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
            LoanDate = today,
            Status = LoanStatus.Active,
            Items = items,
            Note = note,
            DueDate = request.DueDate,
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

        return ServiceResult<LoanResponse>.Success(WithDuration(
            new LoanResponse(
                loan.Id,
                drone.Id,
                drone.Name,
                studentGroup.Id,
                studentGroup.Name,
                QuantityOf(loan, LoanItemType.Battery),
                QuantityOf(loan, LoanItemType.Propeller),
                loan.LoanDate,
                loan.ReturnDate,
                loan.Status,
                loan.Note,
                loan.DueDate),
            loan.LoanDate));
    }

    /// <summary>
    /// Returns a loan (REQ-008) and records what came back (REQ-023). Without returned quantities the loaned
    /// quantities count as returned. Status, return date and quantities change in one transaction.
    /// </summary>
    public async Task<ServiceResult<LoanResponse>> ReturnAsync(
        int id,
        ReturnLoanRequest? request,
        CancellationToken cancellationToken)
    {
        DateOnly? returnDate = Today();

        // The drone is empty only for a returned loan of a drone deleted for good (REQ-034), so "unknown" is the row.
        var loanToReturn = await dbContext.Loans
            .Where(loan => loan.Id == id)
            .Select(loan => new { loan.DroneId })
            .SingleOrDefaultAsync(cancellationToken);
        if (loanToReturn is null)
        {
            return ServiceResult<LoanResponse>.NotFound(Messages.UnknownLoan(id));
        }

        var droneId = loanToReturn.DroneId;

        var items = await dbContext.Set<LoanItem>().Where(item => item.LoanId == id).ToListAsync(cancellationToken);
        var (returned, itemError) = ReadReturnedQuantities(request?.Items, items);
        if (itemError is not null)
        {
            return ServiceResult<LoanResponse>.Invalid(itemError);
        }

        // A blank defect is no defect.
        var defect = string.IsNullOrWhiteSpace(request?.Defect) ? null : request.Defect.Trim();
        if (defect is { Length: > DroneService.MaxDefectLength })
        {
            return ServiceResult<LoanResponse>.Invalid(Messages.DefectTooLong(DroneService.MaxDefectLength));
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        // One statement, so that of two returns at the same time only one changes the loan.
        var changedLoans = await dbContext.Loans
            .Where(loan => loan.Id == id && loan.Status == LoanStatus.Active)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(loan => loan.Status, LoanStatus.Returned)
                    .SetProperty(loan => loan.ReturnDate, returnDate),
                cancellationToken);

        if (changedLoans > 0)
        {
            foreach (var item in items)
            {
                item.ReturnedQuantity = returned.TryGetValue(item.Type, out var quantity) ? quantity : item.Quantity;
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            // The drone comes back damaged: it is Defective instead of available (REQ-024).
            if (defect is not null)
            {
                await dbContext.Drones
                    .Where(drone => drone.Id == droneId)
                    .ExecuteUpdateAsync(setters => setters.SetProperty(drone => drone.DefectNote, defect), cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
        }

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
            : ServiceResult<LoanResponse>.Success(WithDuration(returnedLoan, returnDate.Value));
    }

    private DateOnly Today() => DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime);

    /// <summary>
    /// Adds the full days an active loan has been running and its marks (REQ-012, REQ-022): a loan with a
    /// planned return date is due on that day and overdue once it has passed, with the days since (REQ-035); only a
    /// loan without one becomes long-running.
    /// Computed when the loan is read, so the values never get stale.
    /// </summary>
    private static LoanResponse WithDuration(LoanResponse loan, DateOnly today)
    {
        if (loan.Status != LoanStatus.Active)
        {
            return loan with { DaysActive = null, IsLongRunning = false, IsOverdue = false, IsDueToday = false, DaysOverdue = null };
        }

        var days = today.DayNumber - loan.LoanDate.DayNumber;
        return loan with
        {
            DaysActive = days,
            IsLongRunning = loan.DueDate is null && days > LongRunningAfterDays,
            IsOverdue = loan.DueDate is { } dueDate && today > dueDate,
            // Due today and the full days since the planned return date (REQ-035).
            IsDueToday = loan.DueDate == today,
            DaysOverdue = loan.DueDate is { } plannedDate && today > plannedDate ? today.DayNumber - plannedDate.DayNumber : null,
        };
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

    /// <summary>
    /// Reads the returned quantities: known types only, each once, a whole number from 0 up to the loaned quantity.
    /// </summary>
    private static (Dictionary<LoanItemType, int> Returned, string? Error) ReadReturnedQuantities(
        IReadOnlyList<ReturnLoanItemRequest?>? requestedItems,
        IReadOnlyList<LoanItem> loanedItems)
    {
        var returned = new Dictionary<LoanItemType, int>();

        foreach (var requestedItem in requestedItems ?? [])
        {
            if (requestedItem is null)
            {
                return (returned, Messages.EmptyLoanItem);
            }

            // Enum.TryParse would also accept numbers such as "0", so only the exact names are allowed.
            if (!Enum.GetNames<LoanItemType>().Contains(requestedItem.Type))
            {
                return (returned, Messages.UnknownLoanItemType(requestedItem.Type));
            }

            var type = Enum.Parse<LoanItemType>(requestedItem.Type!);

            if (requestedItem.ReturnedQuantity is not { } quantity)
            {
                return (returned, Messages.LoanItemNeedsQuantity(type.ToString()));
            }

            if (quantity < 0)
            {
                return (returned, Messages.NegativeQuantity);
            }

            if (returned.ContainsKey(type))
            {
                return (returned, Messages.LoanItemTypeTwice(type.ToString()));
            }

            var loaned = loanedItems.Where(item => item.Type == type).Sum(item => item.Quantity);
            if (quantity > loaned)
            {
                return (returned, Messages.MoreReturnedThanLoaned(type.ToString(), loaned));
            }

            returned[type] = quantity;
        }

        return (returned, null);
    }

    private static int QuantityOf(Loan loan, LoanItemType type) =>
        loan.Items.Where(item => item.Type == type).Sum(item => item.Quantity);

    private static ServiceResult<LoanResponse> AlreadyLoaned(Drone drone) =>
        ServiceResult<LoanResponse>.Conflict(Messages.DroneAlreadyLoaned(drone.Name));
}
