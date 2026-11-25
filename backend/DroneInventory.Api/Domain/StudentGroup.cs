namespace DroneInventory.Api.Domain;

public class StudentGroup
{
    public int Id { get; set; }

    public required string Name { get; set; }

    /// <summary>The day the group went into the trash; empty while it is not in the trash (REQ-033).</summary>
    public DateOnly? DeletedAt { get; set; }

    /// <summary>The people in the group (REQ-031). They are deleted together with the group.</summary>
    public List<StudentGroupMember> Members { get; } = [];
}
