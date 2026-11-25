using DroneInventory.Api.Common;

namespace DroneInventory.Api.Statistics;

public static class StatisticsEndpoints
{
    public static void MapStatisticsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/statistics", async (DateOnly? from, DateOnly? to, StatisticsService service, CancellationToken cancellationToken) =>
        {
            var result = await service.GetAsync(from, to, cancellationToken);

            return result.Error is { } error ? error.ToProblem() : Results.Ok(result.Value);
        });
    }
}
