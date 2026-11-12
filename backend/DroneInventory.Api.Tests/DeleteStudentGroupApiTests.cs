using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirement "Delete student group" (REQ-017).
/// </summary>
public sealed class DeleteStudentGroupApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public DeleteStudentGroupApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Delete_a_group_without_loans()
    {
        await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 4" });

        var response = await _client.DeleteAsync($"/api/student-groups/{studentGroupId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(["Group 3"], (await ListAsync("/api/student-groups")).Select(group => group.GetProperty("name").GetString()));
    }

    [Fact]
    public async Task Group_has_loans()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var loanId = await CreateAsync("/api/loans", new { droneId, studentGroupId });
        Assert.Equal(HttpStatusCode.OK, (await _client.PostAsync($"/api/loans/{loanId}/return", null)).StatusCode);

        var response = await _client.DeleteAsync($"/api/student-groups/{studentGroupId}");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Single(await ListAsync("/api/student-groups"));
        var loan = Assert.Single(await ListAsync("/api/loans?status=Returned"));
        Assert.Equal("Group 3", loan.GetProperty("studentGroupName").GetString());
    }

    [Fact]
    public async Task Group_with_an_active_loan()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await CreateAsync("/api/loans", new { droneId, studentGroupId });

        var response = await _client.DeleteAsync($"/api/student-groups/{studentGroupId}");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Single(await ListAsync("/api/loans?status=Active"));
    }

    [Fact]
    public async Task Unknown_student_group()
    {
        var response = await _client.DeleteAsync("/api/student-groups/999");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Message_is_german_when_german_is_requested()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var studentGroupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await CreateAsync("/api/loans", new { droneId, studentGroupId });

        using var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/student-groups/{studentGroupId}");
        request.Headers.AcceptLanguage.ParseAdd("de");
        var response = await _client.SendAsync(request);

        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("kann nicht gelöscht werden", problem.GetProperty("detail").GetString());
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

    private async Task<List<JsonElement>> ListAsync(string path)
    {
        var response = await _client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }
}
