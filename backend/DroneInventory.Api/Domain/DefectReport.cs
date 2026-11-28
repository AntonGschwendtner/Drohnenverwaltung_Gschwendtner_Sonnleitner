namespace DroneInventory.Api.Domain;

/// <summary>
/// One reported defect of a drone (REQ-042). It stays after the repair, so the damage history of a drone and of a
/// student group remains visible. The drone keeps its open defect in <see cref="Drone.DefectNote"/> for the status.
/// </summary>
public class DefectReport
{
    public int Id { get; set; }

    public int DroneId { get; set; }

    public Drone? Drone { get; set; }

    /// <summary>The reporting group; empty when the group was deleted for good or for defects from before REQ-042.</summary>
    public int? StudentGroupId { get; set; }

    /// <summary>The name of the reporting group, kept so it outlives the group.</summary>
    public string? StudentGroupName { get; set; }

    public required string Description { get; set; }

    public DateOnly ReportedOn { get; set; }

    /// <summary>The day the drone was marked as repaired; empty while the defect is open.</summary>
    public DateOnly? RepairedOn { get; set; }
}
