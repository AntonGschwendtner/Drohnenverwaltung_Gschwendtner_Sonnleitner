using DroneInventory.Api.Common;

namespace DroneInventory.Api.Reservations;

public static class ReservationEndpoints
{
    public static void MapReservationEndpoints(this IEndpointRouteBuilder app)
    {
        var reservations = app.MapGroup("/api/reservations");

        reservations.MapGet("/", async (ReservationService service, CancellationToken cancellationToken) =>
            await service.ListAsync(cancellationToken));

        reservations.MapPost("/", async (CreateReservationRequest request, ReservationService service, CancellationToken cancellationToken) =>
        {
            var result = await service.CreateAsync(request, cancellationToken);

            return result.Error is { } error
                ? error.ToProblem()
                : Results.Created($"/api/reservations/{result.Value!.Id}", result.Value);
        });

        reservations.MapDelete("/{id:int}", async (int id, ReservationService service, CancellationToken cancellationToken) =>
        {
            var result = await service.CancelAsync(id, cancellationToken);

            return result.Error is { } error ? error.ToProblem() : Results.NoContent();
        });
    }
}
