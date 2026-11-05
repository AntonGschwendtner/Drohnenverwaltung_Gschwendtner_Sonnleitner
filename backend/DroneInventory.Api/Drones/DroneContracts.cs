using DroneInventory.Api.Domain;

namespace DroneInventory.Api.Drones;

public sealed record CreateDroneRequest(string? Name, string? Description);

public sealed record DroneResponse(int Id, string Name, DroneStatus Status, string Description);
