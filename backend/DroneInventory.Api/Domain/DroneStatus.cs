namespace DroneInventory.Api.Domain;

/// <summary>
/// Defective while a defect is reported (REQ-024); otherwise follows from the active loan.
/// The status itself is never stored.
/// </summary>
public enum DroneStatus
{
    Available,
    Loaned,
    Defective,
}
