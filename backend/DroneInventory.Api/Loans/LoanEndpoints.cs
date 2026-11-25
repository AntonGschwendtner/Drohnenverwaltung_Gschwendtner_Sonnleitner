using DroneInventory.Api.Common;
using DroneInventory.Api.Domain;

namespace DroneInventory.Api.Loans;

public static class LoanEndpoints
{
    public static void MapLoanEndpoints(this IEndpointRouteBuilder app)
    {
        var loans = app.MapGroup("/api/loans");

        loans.MapDelete("/history", async (LoanService service, CancellationToken cancellationToken) =>
            Results.Ok(new { DeletedLoans = await service.DeleteHistoryAsync(cancellationToken) }));

        loans.MapGet("/", async (LoanStatus? status, int? droneId, int? studentGroupId, LoanService service, CancellationToken cancellationToken) =>
        {
            var result = await service.ListAsync(status, droneId, studentGroupId, cancellationToken);

            return result.Error is { } error ? error.ToProblem() : Results.Ok(result.Value);
        });

        // The returned loans as a CSV file for Excel (REQ-025); the header follows the request language.
        loans.MapGet("/export", async (LoanService service, TimeProvider timeProvider, CancellationToken cancellationToken) =>
        {
            var result = await service.ListAsync(LoanStatus.Returned, null, null, cancellationToken);
            var today = DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime);

            return Results.File(
                LoanHistoryCsv.Write(result.Value!),
                "text/csv; charset=utf-8",
                $"loan-history-{today:yyyy-MM-dd}.csv");
        });

        loans.MapPost("/", async (CreateLoanRequest request, LoanService service, CancellationToken cancellationToken) =>
        {
            var result = await service.CreateAsync(request, cancellationToken);

            return result.Error is { } error
                ? error.ToProblem()
                : Results.Created($"/api/loans/{result.Value!.Id}", result.Value);
        });

        // The body is optional: a return without quantities counts everything as returned.
        loans.MapPost("/{id:int}/return", async (int id, ReturnLoanRequest? request, LoanService service, CancellationToken cancellationToken) =>
        {
            var result = await service.ReturnAsync(id, request, cancellationToken);

            return result.Error is { } error ? error.ToProblem() : Results.Ok(result.Value);
        });
    }
}
