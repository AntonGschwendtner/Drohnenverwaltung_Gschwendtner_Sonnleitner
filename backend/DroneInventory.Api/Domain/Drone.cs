namespace DroneInventory.Api.Domain;

public class Drone
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public string Description { get; set; } = string.Empty;

    /// <summary>The reported defect; a drone with a defect is Defective and cannot be loaned (REQ-024).</summary>
    public string? DefectNote { get; set; }

    /// <summary>The student group that reported the defect, kept as a name so it outlives the group (REQ-024).</summary>
    public string? DefectGroupName { get; set; }

    /// <summary>The day the drone went into the trash; empty while it is not in the trash (REQ-034).</summary>
    public DateOnly? DeletedAt { get; set; }
}
