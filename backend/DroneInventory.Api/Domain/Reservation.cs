namespace DroneInventory.Api.Domain;

/// <summary>A drone kept for a student group on one day (REQ-027). Cancelling deletes it.</summary>
public class Reservation
{
    public int Id { get; set; }

    public int DroneId { get; set; }

    public Drone? Drone { get; set; }

    public int StudentGroupId { get; set; }

    public StudentGroup? StudentGroup { get; set; }

    public DateOnly Date { get; set; }
}
