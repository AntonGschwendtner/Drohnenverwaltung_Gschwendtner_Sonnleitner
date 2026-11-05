namespace DroneInventory.Api.Tests;

public sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
{
    private DateTimeOffset _now = now;

    public override TimeZoneInfo LocalTimeZone => TimeZoneInfo.Utc;

    public override DateTimeOffset GetUtcNow() => _now;

    public void SetNow(DateTimeOffset now) => _now = now;
}
