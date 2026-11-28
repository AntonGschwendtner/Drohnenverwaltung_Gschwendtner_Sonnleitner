using DroneInventory.Api.Domain;

namespace DroneInventory.Api.Drones;

public sealed record CreateDroneRequest(string? Name, string? Description);

public sealed record UpdateDroneRequest(string? Name, string? Description);

public sealed record ReportDefectRequest(string? Description, int? StudentGroupId = null);

/// <summary>A drone with its status and, while it is in the trash, the day it went there (REQ-034).</summary>
public sealed record DroneResponse(
    int Id,
    string Name,
    DroneStatus Status,
    string Description,
    string? DefectNote = null,
    DateOnly? DeletedAt = null,
    DateOnly? NextReservationDate = null,
    string? NextReservationGroup = null,
    string? DefectGroupName = null);

/// <summary>A drone in the trash with what a permanent delete would take with it (REQ-034).</summary>
public sealed record TrashedDroneResponse(int Id, string Name, DateOnly DeletedAt, int LoanCount);
