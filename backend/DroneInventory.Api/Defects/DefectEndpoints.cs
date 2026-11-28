using DroneInventory.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Defects;

/// <summary>One entry of the damage history (REQ-042).</summary>
public sealed record DefectReportResponse(
    int Id,
    int DroneId,
    string DroneName,
    int? StudentGroupId,
    string? StudentGroupName,
    string Description,
    DateOnly ReportedOn,
    DateOnly? RepairedOn);

/// <summary>Reads the damage history of a drone or of a student group, the newest report first (REQ-042).</summary>
public class DefectService(DroneInventoryDbContext dbContext)
{
    public async Task<IReadOnlyList<DefectReportResponse>> ListAsync(
        int? droneId,
        int? studentGroupId,
        CancellationToken cancellationToken)
    {
        var reports = dbContext.DefectReports.AsQueryable();
        if (droneId is { } drone)
        {
            reports = reports.Where(report => report.DroneId == drone);
        }

        if (studentGroupId is { } group)
        {
            reports = reports.Where(report => report.StudentGroupId == group);
        }

        return await reports
            .OrderByDescending(report => report.ReportedOn)
            .ThenByDescending(report => report.Id)
            .Select(report => new DefectReportResponse(
                report.Id,
                report.DroneId,
                report.Drone!.Name,
                report.StudentGroupId,
                report.StudentGroupName,
                report.Description,
                report.ReportedOn,
                report.RepairedOn))
            .ToListAsync(cancellationToken);
    }
}

public static class DefectEndpoints
{
    public static void MapDefectEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/defects", async (int? droneId, int? studentGroupId, DefectService service, CancellationToken cancellationToken) =>
            await service.ListAsync(droneId, studentGroupId, cancellationToken));
    }
}
