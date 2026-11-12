using DroneInventory.Api.Common;

namespace DroneInventory.Api.Drones;

public static class DroneEndpoints
{
    public static void MapDroneEndpoints(this IEndpointRouteBuilder app)
    {
        var drones = app.MapGroup("/api/drones");

        drones.MapGet("/", async (DroneService service, CancellationToken cancellationToken) =>
            await service.ListAsync(cancellationToken));

        drones.MapPost("/", async (CreateDroneRequest request, DroneService service, CancellationToken cancellationToken) =>
        {
            var result = await service.CreateAsync(request, cancellationToken);

            return result.Error is { } error
                ? error.ToProblem()
                : Results.Created($"/api/drones/{result.Value!.Id}", result.Value);
        });

        drones.MapPut("/{id:int}", async (int id, UpdateDroneRequest request, DroneService service, CancellationToken cancellationToken) =>
        {
            var result = await service.UpdateAsync(id, request, cancellationToken);

            return result.Error is { } error ? error.ToProblem() : Results.Ok(result.Value);
        });
    }
}
