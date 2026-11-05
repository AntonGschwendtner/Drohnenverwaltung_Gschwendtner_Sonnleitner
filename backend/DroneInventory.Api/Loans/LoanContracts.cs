using DroneInventory.Api.Domain;

namespace DroneInventory.Api.Loans;

public sealed record CreateLoanRequest(int? DroneId, int? StudentGroupId);

public sealed record LoanResponse(
    int Id,
    int DroneId,
    string DroneName,
    int StudentGroupId,
    string StudentGroupName,
    DateOnly LoanDate,
    DateOnly? ReturnDate,
    LoanStatus Status);
