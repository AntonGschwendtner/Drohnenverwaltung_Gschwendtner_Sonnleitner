namespace DroneInventory.Api.Domain;

/// <summary>
/// Follows from the active loan and is never stored or entered.
/// </summary>
public enum DroneStatus
{
    Available,
    Loaned,
}
