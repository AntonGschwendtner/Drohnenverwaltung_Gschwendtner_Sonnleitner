using DroneInventory.Api.Common;

namespace DroneInventory.Api.StudentGroups;

public static class StudentGroupEndpoints
{
    public static void MapStudentGroupEndpoints(this IEndpointRouteBuilder app)
    {
        var studentGroups = app.MapGroup("/api/student-groups");

        studentGroups.MapGet("/", async (StudentGroupService service, CancellationToken cancellationToken) =>
            await service.ListAsync(cancellationToken));

        studentGroups.MapPost("/", async (CreateStudentGroupRequest request, StudentGroupService service, CancellationToken cancellationToken) =>
        {
            var result = await service.CreateAsync(request, cancellationToken);

            return result.Error is { } error
                ? error.ToProblem()
                : Results.Created($"/api/student-groups/{result.Value!.Id}", result.Value);
        });

        studentGroups.MapPut("/{id:int}", async (int id, UpdateStudentGroupRequest request, StudentGroupService service, CancellationToken cancellationToken) =>
        {
            var result = await service.UpdateAsync(id, request, cancellationToken);

            return result.Error is { } error ? error.ToProblem() : Results.Ok(result.Value);
        });
    }
}
