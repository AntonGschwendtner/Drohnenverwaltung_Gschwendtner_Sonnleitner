using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>Scenarios of the reservations (REQ-027 to REQ-029). Today is 19.08.2026.</summary>
public sealed class ReservationApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public ReservationApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Reserve_a_drone()
    {
        var (drone, group3, _) = await SetupAsync();

        var response = await ReserveAsync(drone, group3, "2026-08-21");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var reservation = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("TELLO-07", reservation.GetProperty("droneName").GetString());
        Assert.Equal("Group 3", reservation.GetProperty("studentGroupName").GetString());
        Assert.Equal("2026-08-21", reservation.GetProperty("date").GetString());
        Assert.False(reservation.GetProperty("isToday").GetBoolean());
    }

    [Fact]
    public async Task Day_in_the_past()
    {
        var (drone, group3, _) = await SetupAsync();

        await ApiResponseAssert.IsProblemAsync(await ReserveAsync(drone, group3, "2026-08-18"), HttpStatusCode.BadRequest);
        Assert.Empty(await ListAsync());
    }

    [Fact]
    public async Task Drone_already_reserved_on_that_day()
    {
        var (drone, group3, group4) = await SetupAsync();
        await ReserveAsync(drone, group3, "2026-08-21");

        var response = await ReserveAsync(drone, group4, "2026-08-21");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Contains("21.08.2026", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Same_drone_on_another_day()
    {
        var (drone, group3, group4) = await SetupAsync();
        await ReserveAsync(drone, group3, "2026-08-21");

        Assert.Equal(HttpStatusCode.Created, (await ReserveAsync(drone, group4, "2026-08-22")).StatusCode);
        Assert.Equal(2, (await ListAsync()).Count);
    }

    [Fact]
    public async Task Unknown_drone_or_student_group()
    {
        var (drone, group3, _) = await SetupAsync();

        await ApiResponseAssert.IsProblemAsync(await ReserveAsync(999, group3, "2026-08-21"), HttpStatusCode.BadRequest);
        await ApiResponseAssert.IsProblemAsync(await ReserveAsync(drone, 999, "2026-08-21"), HttpStatusCode.BadRequest);
        await ApiResponseAssert.IsProblemAsync(
            await _client.PostAsJsonAsync("/api/reservations", new { droneId = drone, studentGroupId = group3 }),
            HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Defective_drone()
    {
        var (drone, group3, _) = await SetupAsync();
        await _client.PostAsJsonAsync($"/api/drones/{drone}/defect", new { description = "Motor", studentGroupId = group3 });

        await ApiResponseAssert.IsProblemAsync(await ReserveAsync(drone, group3, "2026-08-21"), HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Drone_or_group_in_the_trash()
    {
        var (drone, group3, group4) = await SetupAsync();
        var other = await CreateAsync("/api/drones", new { name = "TELLO-08" });
        await _client.DeleteAsync($"/api/drones/{drone}");
        await _client.DeleteAsync($"/api/student-groups/{group4}");

        await ApiResponseAssert.IsProblemAsync(await ReserveAsync(drone, group3, "2026-08-21"), HttpStatusCode.Conflict);
        await ApiResponseAssert.IsProblemAsync(await ReserveAsync(other, group4, "2026-08-21"), HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Two_reservations_at_the_same_time()
    {
        var (drone, group3, group4) = await SetupAsync();

        var responses = await Task.WhenAll(Enumerable.Range(0, 6).Select(i =>
            _factory.CreateClient().PostAsJsonAsync("/api/reservations", new { droneId = drone, studentGroupId = i % 2 == 0 ? group3 : group4, date = "2026-08-21" })));

        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Created);
        Assert.All(responses.Where(r => r.StatusCode != HttpStatusCode.Created), r => Assert.Equal(HttpStatusCode.Conflict, r.StatusCode));
        Assert.Single(await ListAsync());
    }

    [Fact]
    public async Task List_upcoming_reservations()
    {
        var (drone, group3, _) = await SetupAsync();
        await ReserveAsync(drone, group3, "2026-08-21");
        await ReserveAsync(drone, group3, "2026-08-20");
        await ReserveAsync(drone, group3, "2026-08-19");
        _factory.Time.SetNow(new DateTimeOffset(2026, 8, 20, 12, 0, 0, TimeSpan.Zero));

        var dates = (await ListAsync()).Select(r => r.GetProperty("date").GetString());

        Assert.Equal(["2026-08-20", "2026-08-21"], dates);
        Assert.True((await ListAsync())[0].GetProperty("isToday").GetBoolean());
    }

    [Fact]
    public async Task Cancel_a_reservation()
    {
        var (drone, group3, group4) = await SetupAsync();
        var id = (await (await ReserveAsync(drone, group3, "2026-08-21")).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();

        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"/api/reservations/{id}")).StatusCode);

        Assert.Empty(await ListAsync());
        Assert.Equal(HttpStatusCode.Created, (await ReserveAsync(drone, group4, "2026-08-21")).StatusCode);
        await ApiResponseAssert.IsProblemAsync(await _client.DeleteAsync($"/api/reservations/{id}"), HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Reservation_of_a_loaned_drone()
    {
        var (drone, group3, group4) = await SetupAsync();
        await _client.PostAsJsonAsync("/api/loans", new { droneId = drone, studentGroupId = group4 });

        var response = await ReserveAsync(drone, group3, "2026-08-21");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.True(Assert.Single(await ListAsync()).GetProperty("droneIsLoaned").GetBoolean());
    }

    [Fact]
    public async Task Reserving_group_loans_on_the_reserved_day()
    {
        var (drone, group3, _) = await SetupAsync();
        await ReserveAsync(drone, group3, "2026-08-19");

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId = drone, studentGroupId = group3 });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Other_group_on_the_reserved_day()
    {
        var (drone, group3, group4) = await SetupAsync();
        await ReserveAsync(drone, group3, "2026-08-19");

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId = drone, studentGroupId = group4 });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Contains("Group 3", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Loan_before_the_reserved_day()
    {
        var (drone, group3, group4) = await SetupAsync();
        await ReserveAsync(drone, group3, "2026-08-21");

        var drones = await _client.GetFromJsonAsync<List<JsonElement>>("/api/drones");
        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId = drone, studentGroupId = group4 });

        Assert.Equal("2026-08-21", drones![0].GetProperty("nextReservationDate").GetString());
        Assert.Equal("Group 3", drones[0].GetProperty("nextReservationGroup").GetString());
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Delete_a_reserved_drone()
    {
        var (drone, group3, _) = await SetupAsync();
        await ReserveAsync(drone, group3, "2026-08-21");

        var response = await _client.DeleteAsync($"/api/drones/{drone}");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Contains("21.08.2026", await response.Content.ReadAsStringAsync());
        Assert.Single(await _client.GetFromJsonAsync<List<JsonElement>>("/api/drones") ?? []);
    }

    [Fact]
    public async Task Delete_a_group_with_a_reservation()
    {
        var (drone, group3, _) = await SetupAsync();
        await ReserveAsync(drone, group3, "2026-08-21");

        await ApiResponseAssert.IsProblemAsync(await _client.DeleteAsync($"/api/student-groups/{group3}"), HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Past_reservation_does_not_block_the_trash_and_goes_with_the_drone()
    {
        var (drone, group3, _) = await SetupAsync();
        await ReserveAsync(drone, group3, "2026-08-19");
        _factory.Time.SetNow(new DateTimeOffset(2026, 8, 20, 12, 0, 0, TimeSpan.Zero));

        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"/api/drones/{drone}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"/api/drones/{drone}/permanent?history=keep")).StatusCode);
    }

    [Fact]
    public async Task Reservations_go_with_the_general_reset()
    {
        var (drone, group3, _) = await SetupAsync();
        await ReserveAsync(drone, group3, "2026-08-21");

        var response = await _client.PostAsJsonAsync("/api/admin/reset", new { deleteAllDrones = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(await ListAsync());
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task<(int Drone, int Group3, int Group4)> SetupAsync() => (
        await CreateAsync("/api/drones", new { name = "TELLO-07" }),
        await CreateAsync("/api/student-groups", new { name = "Group 3" }),
        await CreateAsync("/api/student-groups", new { name = "Group 4" }));

    private Task<HttpResponseMessage> ReserveAsync(int droneId, int groupId, string date) =>
        _client.PostAsJsonAsync("/api/reservations", new { droneId, studentGroupId = groupId, date });

    private async Task<List<JsonElement>> ListAsync() =>
        (await _client.GetFromJsonAsync<List<JsonElement>>("/api/reservations"))!;

    private async Task<int> CreateAsync(string path, object body)
    {
        var response = await _client.PostAsJsonAsync(path, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }
}
