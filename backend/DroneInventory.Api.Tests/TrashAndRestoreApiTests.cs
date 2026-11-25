using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>Scenarios of the requirements "Student group trash" and "Restore student group" (REQ-033).</summary>
public sealed class TrashAndRestoreApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public TrashAndRestoreApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Show_the_trash()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        foreach (var name in new[] { "Anna Huber", "Ben Wagner", "Clara Berger" })
        {
            await CreateAsync($"/api/student-groups/{groupId}/members", new { name });
        }

        await ReturnedLoanAsync("TELLO-07", groupId);
        await ReturnedLoanAsync("TELLO-08", groupId);
        _factory.Time.SetNow(new DateTimeOffset(2026, 8, 20, 9, 0, 0, TimeSpan.Zero));
        await _client.DeleteAsync($"/api/student-groups/{groupId}");

        var trashed = Assert.Single(await ListAsync("/api/student-groups/trash"));

        Assert.Equal(groupId, trashed.GetProperty("id").GetInt32());
        Assert.Equal("Group 3", trashed.GetProperty("name").GetString());
        Assert.Equal("2026-08-20", trashed.GetProperty("deletedAt").GetString());
        Assert.Equal(2, trashed.GetProperty("loanCount").GetInt32());
        Assert.Equal(3, trashed.GetProperty("memberCount").GetInt32());
    }

    [Fact]
    public async Task Most_recently_deleted_group_comes_first()
    {
        var group3 = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var group4 = await CreateAsync("/api/student-groups", new { name = "Group 4" });
        await CreateAsync("/api/student-groups", new { name = "Group 5" });
        await _client.DeleteAsync($"/api/student-groups/{group3}");
        _factory.Time.SetNow(DroneInventoryApiFactory.FixedNow.AddDays(2));
        await _client.DeleteAsync($"/api/student-groups/{group4}");

        var names = (await ListAsync("/api/student-groups/trash")).Select(group => group.GetProperty("name").GetString());

        Assert.Equal(["Group 4", "Group 3"], names);
    }

    [Fact]
    public async Task Empty_trash()
    {
        await CreateAsync("/api/student-groups", new { name = "Group 3" });

        Assert.Empty(await ListAsync("/api/student-groups/trash"));
    }

    [Fact]
    public async Task Restore_a_group()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await CreateAsync($"/api/student-groups/{groupId}/members", new { name = "Anna Huber" });
        await ReturnedLoanAsync("TELLO-07", groupId);
        await _client.DeleteAsync($"/api/student-groups/{groupId}");

        var response = await _client.PostAsync($"/api/student-groups/{groupId}/restore", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var group = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Null, group.GetProperty("deletedAt").ValueKind);
        Assert.Equal("Anna Huber", group.GetProperty("members")[0].GetProperty("name").GetString());
        Assert.Equal(["Group 3"], (await ListAsync("/api/student-groups")).Select(g => g.GetProperty("name").GetString()));
        Assert.Empty(await ListAsync("/api/student-groups/trash"));
        Assert.Single(await ListAsync("/api/loans?status=Returned"));

        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-08", description = "x" });
        var loan = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = groupId });
        Assert.Equal(HttpStatusCode.Created, loan.StatusCode);
    }

    [Fact]
    public async Task Group_is_not_in_the_trash()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 4" });

        var response = await _client.PostAsync($"/api/student-groups/{groupId}/restore", null);

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
        Assert.Single(await ListAsync("/api/student-groups"));
    }

    [Fact]
    public async Task Unknown_group_cannot_be_restored()
    {
        var response = await _client.PostAsync("/api/student-groups/999/restore", null);

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Open_a_group_in_the_trash()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await ReturnedLoanAsync("TELLO-07", groupId);
        await _client.DeleteAsync($"/api/student-groups/{groupId}");

        var response = await _client.GetAsync($"/api/student-groups/{groupId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var group = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("2026-08-19", group.GetProperty("deletedAt").GetString());
        Assert.Single(await ListAsync($"/api/loans?studentGroupId={groupId}"));
    }

    [Fact]
    public async Task Group_outside_the_trash_has_no_deletion_date()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });

        var group = await _client.GetFromJsonAsync<JsonElement>($"/api/student-groups/{groupId}");

        Assert.Equal(JsonValueKind.Null, group.GetProperty("deletedAt").ValueKind);
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task ReturnedLoanAsync(string droneName, int groupId)
    {
        var droneId = await CreateAsync("/api/drones", new { name = droneName, description = "x" });
        var loanId = await CreateAsync("/api/loans", new { droneId, studentGroupId = groupId });
        Assert.Equal(HttpStatusCode.OK, (await _client.PostAsync($"/api/loans/{loanId}/return", null)).StatusCode);
    }

    private async Task<int> CreateAsync(string path, object body)
    {
        var response = await _client.PostAsJsonAsync(path, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    private async Task<List<JsonElement>> ListAsync(string path)
    {
        var response = await _client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }
}
