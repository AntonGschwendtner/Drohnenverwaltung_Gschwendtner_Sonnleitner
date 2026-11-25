using DroneInventory.Api.Common;

namespace DroneInventory.Api.Admin;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var admin = app.MapGroup("/api/admin");

        admin.MapPost("/reset", async (ResetRequest request, AdminService service, CancellationToken cancellationToken) =>
        {
            var result = await service.ResetAsync(request, cancellationToken);

            return result.Error is { } error ? error.ToProblem() : Results.Ok(result.Value);
        });

        admin.MapGet("/backup", async (AdminService service, TimeProvider timeProvider, CancellationToken cancellationToken) =>
        {
            var backup = await service.BackupAsync(cancellationToken);
            var date = DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime);

            return Results.File(backup, "application/vnd.sqlite3", $"drohnenverwaltung-backup-{date:yyyy-MM-dd}.db");
        });

        // A plain file upload from the settings dialog; there are no cookies to protect, so no antiforgery token.
        admin.MapPost("/restore", async (IFormFile? file, AdminService service, CancellationToken cancellationToken) =>
        {
            if (file is null)
            {
                return new ServiceError(ServiceErrorKind.Invalid, Messages.BackupInvalid).ToProblem();
            }

            await using var stream = file.OpenReadStream();
            var result = await service.RestoreAsync(stream, file.Length, cancellationToken);

            return result.Error is { } error ? error.ToProblem() : Results.NoContent();
        }).DisableAntiforgery();
    }
}
