namespace DroneInventory.Api.Common;

/// <summary>How many entries emptying a trash deleted for good (REQ-033, REQ-034).</summary>
public sealed record EmptyTrashResponse(int Deleted);
