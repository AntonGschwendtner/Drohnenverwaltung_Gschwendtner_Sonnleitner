using DroneInventory.Api.Common;

namespace DroneInventory.Api.Drones;

public static class DroneEndpoints
{
    public static void MapDroneEndpoints(this IEndpointRouteBuilder app)
    {
        var drones = app.MapGroup("/api/drones");

        drones.MapGet("/", async (DroneService service, CancellationToken cancellationToken) =>
            await service.ListAsync(cancellationToken));

        drones.MapGet("/trash", async (DroneService service, CancellationToken cancellationToken) =>
            await service.ListTrashAsync(cancellationToken));

        drones.MapDelete("/trash", async (string? history, DroneService service, CancellationToken cancellationToken) =>
        {
            var result = await service.EmptyTrashAsync(history, cancellationToken);

            return result.Error is { } error ? error.ToProblem() : Results.Ok(result.Value);
        });

        drones.MapPost("/{id:int}/restore", async (int id, DroneService service, CancellationToken cancellationToken) =>
        {
            var result = await service.RestoreAsync(id, cancellationToken);

            return result.Error is { } error ? error.ToProblem() : Results.Ok(result.Value);
        });

        drones.MapDelete("/{id:int}/permanent", async (int id, string? history, DroneService service, CancellationToken cancellationToken) =>
        {
            var result = await service.DeletePermanentlyAsync(id, history, cancellationToken);

            return result.Error is { } error ? error.ToProblem() : Results.NoContent();
        });

        drones.MapGet("/{id:int}", async (int id, DroneService service, CancellationToken cancellationToken) =>
        {
            var result = await service.GetAsync(id, cancellationToken);

            return result.Error is { } error ? error.ToProblem() : Results.Ok(result.Value);
        });

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

        drones.MapPost("/{id:int}/defect", async (int id, ReportDefectRequest request, DroneService service, CancellationToken cancellationToken) =>
        {
            var result = await service.ReportDefectAsync(id, request, cancellationToken);

            return result.Error is { } error ? error.ToProblem() : Results.Ok(result.Value);
        });

        drones.MapPost("/{id:int}/repair", async (int id, DroneService service, CancellationToken cancellationToken) =>
        {
            var result = await service.RepairAsync(id, cancellationToken);

            return result.Error is { } error ? error.ToProblem() : Results.Ok(result.Value);
        });

        drones.MapDelete("/{id:int}", async (int id, DroneService service, CancellationToken cancellationToken) =>
        {
            var result = await service.DeleteAsync(id, cancellationToken);

            return result.Error is { } error ? error.ToProblem() : Results.NoContent();
        });
    }
}
