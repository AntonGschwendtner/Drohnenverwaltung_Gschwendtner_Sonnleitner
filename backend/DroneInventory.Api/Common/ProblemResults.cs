namespace DroneInventory.Api.Common;

public static class ProblemResults
{
    public static IResult ToProblem(this ServiceError error)
    {
        var statusCode = error.Kind switch
        {
            ServiceErrorKind.Invalid => StatusCodes.Status400BadRequest,
            ServiceErrorKind.NotFound => StatusCodes.Status404NotFound,
            ServiceErrorKind.Conflict => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status500InternalServerError,
        };

        return Results.Problem(detail: error.Message, statusCode: statusCode);
    }
}
