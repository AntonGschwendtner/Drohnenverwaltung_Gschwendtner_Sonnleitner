using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirement "Edit student group" (REQ-017).
/// </summary>
public sealed class EditStudentGroupApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public EditStudentGroupApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Correct_a_name()
    {
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Grup 3" });

        var response = await _client.PutAsJsonAsync($"/api/student-groups/{studentGroupId}", new { name = "Group 3" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var studentGroup = Assert.Single(await ListStudentGroupsAsync());
        Assert.Equal("Group 3", studentGroup.GetProperty("name").GetString());
        Assert.Equal(studentGroupId, studentGroup.GetProperty("id").GetInt32());
    }

    [Fact]
    public async Task Renamed_group_keeps_its_loans()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Grup 3" });
        await CreateAsync("/api/loans", new { droneId, studentGroupId });

        await _client.PutAsJsonAsync($"/api/student-groups/{studentGroupId}", new { name = "Group 3" });

        var response = await _client.GetAsync("/api/loans?status=Active");
        var loan = Assert.Single((await response.Content.ReadFromJsonAsync<List<JsonElement>>())!);
        Assert.Equal("Group 3", loan.GetProperty("studentGroupName").GetString());
    }

    [Fact]
    public async Task Name_already_used()
    {
        await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var secondId = await CreateAsync("/api/student-groups", new { name = "Group 4" });

        var response = await _client.PutAsJsonAsync($"/api/student-groups/{secondId}", new { name = "Group 3" });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Equal(["Group 3", "Group 4"], (await ListStudentGroupsAsync()).Select(group => group.GetProperty("name").GetString()));
    }

    [Fact]
    public async Task A_group_may_keep_its_own_name()
    {
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });

        var response = await _client.PutAsJsonAsync($"/api/student-groups/{studentGroupId}", new { name = "Group 3" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Name_is_missing()
    {
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });

        var response = await _client.PutAsJsonAsync($"/api/student-groups/{studentGroupId}", new { name = "" });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal("Group 3", (await ListStudentGroupsAsync()).Single().GetProperty("name").GetString());
    }

    [Fact]
    public async Task Unknown_student_group()
    {
        var response = await _client.PutAsJsonAsync("/api/student-groups/999", new { name = "Group 3" });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
        Assert.Empty(await ListStudentGroupsAsync());
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task<int> CreateAsync(string path, object body)
    {
        var response = await _client.PostAsJsonAsync(path, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        return created.GetProperty("id").GetInt32();
    }

    private async Task<List<JsonElement>> ListStudentGroupsAsync()
    {
        var response = await _client.GetAsync("/api/student-groups");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }
}
