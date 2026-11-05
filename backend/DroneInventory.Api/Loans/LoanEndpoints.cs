using DroneInventory.Api.Common;
using DroneInventory.Api.Domain;

namespace DroneInventory.Api.Loans;

public static class LoanEndpoints
{
    public static void MapLoanEndpoints(this IEndpointRouteBuilder app)
    {
        var loans = app.MapGroup("/api/loans");

        loans.MapGet("/", async (LoanStatus? status, LoanService service, CancellationToken cancellationToken) =>
        {
            var result = await service.ListAsync(status, cancellationToken);

            return result.Error is { } error ? error.ToProblem() : Results.Ok(result.Value);
        });

        loans.MapPost("/", async (CreateLoanRequest request, LoanService service, CancellationToken cancellationToken) =>
        {
            var result = await service.CreateAsync(request, cancellationToken);

            return result.Error is { } error
                ? error.ToProblem()
                : Results.Created($"/api/loans/{result.Value!.Id}", result.Value);
        });

        loans.MapPost("/{id:int}/return", async (int id, LoanService service, CancellationToken cancellationToken) =>
        {
            var result = await service.ReturnAsync(id, cancellationToken);

            return result.Error is { } error ? error.ToProblem() : Results.Ok(result.Value);
        });
    }
}
