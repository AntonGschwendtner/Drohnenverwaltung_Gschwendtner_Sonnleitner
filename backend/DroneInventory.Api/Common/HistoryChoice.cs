namespace DroneInventory.Api.Common;

/// <summary>
/// What happens to the loans when a student group or a drone is deleted for good from the trash (REQ-033, REQ-034).
/// </summary>
public static class HistoryChoice
{
    /// <summary>The loans stay in the history under the name of the deleted group or drone.</summary>
    public const string Keep = "keep";

    /// <summary>The loans are deleted together with the group or drone.</summary>
    public const string Delete = "delete";

    public static bool IsValid(string? history) => history is Keep or Delete;
}
