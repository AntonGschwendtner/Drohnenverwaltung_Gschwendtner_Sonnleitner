using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>Scenarios of the requirement "Empty the trash" for drones (REQ-034) and student groups (REQ-033).</summary>
public sealed class EmptyTrashApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public EmptyTrashApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Empty_the_drone_trash_and_keep_the_history()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var tello7 = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "" });
        var tello8 = await CreateAsync("/api/drones", new { name = "TELLO-08", description = "" });
        await CreateAsync("/api/drones", new { name = "TELLO-09", description = "" });
        await ReturnedLoanAsync(tello7, groupId);
        await _client.DeleteAsync($"/api/drones/{tello7}");
        await _client.DeleteAsync($"/api/drones/{tello8}");

        var response = await _client.DeleteAsync("/api/drones/trash?history=keep");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("deleted").GetInt32());
        Assert.Empty(await ListAsync("/api/drones/trash"));
        Assert.Equal("TELLO-09", Assert.Single(await ListAsync("/api/drones")).GetProperty("name").GetString());
        Assert.Single(await ListAsync("/api/loans?status=Returned"));
    }

    [Fact]
    public async Task Empty_the_drone_trash_with_the_history()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "" });
        await ReturnedLoanAsync(droneId, groupId);
        await _client.DeleteAsync($"/api/drones/{droneId}");

        var response = await _client.DeleteAsync("/api/drones/trash?history=delete");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(await ListAsync("/api/drones/trash"));
        Assert.Empty(await ListAsync("/api/loans?status=Returned"));
    }

    [Fact]
    public async Task Empty_the_student_group_trash()
    {
        var group3 = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var group4 = await CreateAsync("/api/student-groups", new { name = "Group 4" });
        await CreateAsync("/api/student-groups", new { name = "Group 5" });
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "" });
        await ReturnedLoanAsync(droneId, group3);
        await _client.DeleteAsync($"/api/student-groups/{group3}");
        await _client.DeleteAsync($"/api/student-groups/{group4}");

        var response = await _client.DeleteAsync("/api/student-groups/trash?history=keep");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("deleted").GetInt32());
        Assert.Empty(await ListAsync("/api/student-groups/trash"));
        Assert.Equal("Group 5", Assert.Single(await ListAsync("/api/student-groups")).GetProperty("name").GetString());
        Assert.Single(await ListAsync("/api/loans?status=Returned"));
    }

    [Theory]
    [InlineData("/api/drones/trash")]
    [InlineData("/api/student-groups/trash")]
    [InlineData("/api/drones/trash?history=maybe")]
    public async Task History_choice_is_missing(string path)
    {
        var response = await _client.DeleteAsync(path);

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Empty_trash_deletes_nothing()
    {
        var response = await _client.DeleteAsync("/api/drones/trash?history=keep");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(0, (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("deleted").GetInt32());
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task ReturnedLoanAsync(int droneId, int studentGroupId)
    {
        var loanId = await CreateAsync("/api/loans", new { droneId, studentGroupId });
        var response = await _client.PostAsync($"/api/loans/{loanId}/return", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
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
