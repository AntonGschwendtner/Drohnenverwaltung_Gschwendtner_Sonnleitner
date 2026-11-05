namespace DroneInventory.Api.StudentGroups;

public sealed record CreateStudentGroupRequest(string? Name);

public sealed record StudentGroupResponse(int Id, string Name);
