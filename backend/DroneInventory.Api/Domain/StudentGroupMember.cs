namespace DroneInventory.Api.Domain;

/// <summary>
/// A person in a student group (REQ-031). Only the name is stored. At most one member of a group is its leader.
/// </summary>
public class StudentGroupMember
{
    /// <summary>The longest name a member accepts.</summary>
    public const int MaxNameLength = 100;

    public int Id { get; set; }

    public int StudentGroupId { get; set; }

    public required string Name { get; set; }

    public bool IsLeader { get; set; }
}
