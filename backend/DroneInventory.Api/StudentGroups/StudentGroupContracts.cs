namespace DroneInventory.Api.StudentGroups;

public sealed record CreateStudentGroupRequest(string? Name);

public sealed record UpdateStudentGroupRequest(string? Name);

public sealed record StudentGroupResponse(int Id, string Name);

public sealed record AddMemberRequest(string? Name);

public sealed record StudentGroupMemberResponse(int Id, string Name, bool IsLeader);
