using DroneInventory.Api.Domain;

namespace DroneInventory.Api.Loans;

public sealed record CreateLoanItemRequest(string? Type, int? Quantity);

public sealed record ReturnLoanItemRequest(string? Type, int? ReturnedQuantity);

/// <summary>Optional body of a return; without it everything counts as returned (REQ-023).</summary>
public sealed record ReturnLoanRequest(IReadOnlyList<ReturnLoanItemRequest?>? Items);

public sealed record CreateLoanRequest(
    int? DroneId,
    int? StudentGroupId,
    IReadOnlyList<CreateLoanItemRequest?>? Items,
    string? Note = null,
    DateOnly? DueDate = null);

public sealed record LoanResponse(
    int Id,
    int DroneId,
    string DroneName,
    int StudentGroupId,
    string StudentGroupName,
    int Batteries,
    int Propellers,
    DateOnly LoanDate,
    DateOnly? ReturnDate,
    LoanStatus Status,
    string? Note = null,
    DateOnly? DueDate = null,
    int MissingBatteries = 0,
    int MissingPropellers = 0,
    int? DaysActive = null,
    bool IsLongRunning = false,
    bool IsOverdue = false);
