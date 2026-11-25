namespace DroneInventory.Api.Reservations;

public sealed record CreateReservationRequest(int? DroneId, int? StudentGroupId, DateOnly? Date);

/// <summary>A reservation with names, whether it is for today and whether the drone is loaned right now (REQ-028).</summary>
public sealed record ReservationResponse(
    int Id,
    int DroneId,
    string DroneName,
    int StudentGroupId,
    string StudentGroupName,
    DateOnly Date,
    bool IsToday,
    bool DroneIsLoaned);
