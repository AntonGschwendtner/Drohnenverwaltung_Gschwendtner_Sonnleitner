namespace DroneInventory.Api.StudentGroups;

public sealed record CreateStudentGroupRequest(string? Name);

public sealed record UpdateStudentGroupRequest(string? Name);

/// <summary>A student group with its members in alphabetical order and the name of its leader, if any (REQ-031).</summary>
public sealed record StudentGroupResponse(
    int Id,
    string Name,
    IReadOnlyList<StudentGroupMemberResponse> Members,
    string? LeaderName);

public sealed record AddMemberRequest(string? Name);

/// <summary>The member to make group leader, or null to leave the group without a leader (REQ-031).</summary>
public sealed record SetLeaderRequest(int? MemberId);

public sealed record StudentGroupMemberResponse(int Id, string Name, bool IsLeader);
