namespace DroneInventory.Api.Common;

public enum ServiceErrorKind
{
    Invalid,
    NotFound,
    Conflict,
}

public sealed record ServiceError(ServiceErrorKind Kind, string Message);

/// <summary>
/// The outcome of a service call: either a value or the reason it was rejected.
/// </summary>
public sealed class ServiceResult<T>
{
    private ServiceResult(T? value, ServiceError? error)
    {
        Value = value;
        Error = error;
    }

    public T? Value { get; }

    public ServiceError? Error { get; }

    public static ServiceResult<T> Success(T value) => new(value, null);

    public static ServiceResult<T> Invalid(string message) => new(default, new ServiceError(ServiceErrorKind.Invalid, message));

    public static ServiceResult<T> NotFound(string message) => new(default, new ServiceError(ServiceErrorKind.NotFound, message));

    public static ServiceResult<T> Conflict(string message) => new(default, new ServiceError(ServiceErrorKind.Conflict, message));
}
