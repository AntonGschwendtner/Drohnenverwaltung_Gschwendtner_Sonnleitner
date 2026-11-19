using DroneInventory.Api.Domain;

namespace DroneInventory.Api.Loans;

public sealed record CreateLoanItemRequest(string? Type, int? Quantity);

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
    int? DaysActive = null,
    bool IsLongRunning = false,
    bool IsOverdue = false);
