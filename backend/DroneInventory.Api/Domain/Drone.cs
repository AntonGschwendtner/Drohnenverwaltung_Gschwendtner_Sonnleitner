namespace DroneInventory.Api.Domain;

public class Drone
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public string Description { get; set; } = string.Empty;

    /// <summary>The reported defect; a drone with a defect is Defective and cannot be loaned (REQ-024).</summary>
    public string? DefectNote { get; set; }
}
