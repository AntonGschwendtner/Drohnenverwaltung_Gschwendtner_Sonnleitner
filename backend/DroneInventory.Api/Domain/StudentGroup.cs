namespace DroneInventory.Api.Domain;

public class StudentGroup
{
    public int Id { get; set; }

    public required string Name { get; set; }

    /// <summary>The people in the group (REQ-031). They are deleted together with the group.</summary>
    public List<StudentGroupMember> Members { get; } = [];
}
