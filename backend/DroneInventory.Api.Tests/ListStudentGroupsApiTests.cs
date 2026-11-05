using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenario of the requirement "List student groups" (REQ-003).
/// </summary>
public sealed class ListStudentGroupsApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public ListStudentGroupsApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task List_student_groups()
    {
        var created = await CreateStudentGroupAsync("Group 3");

        var studentGroup = Assert.Single(await ListStudentGroupsAsync());

        Assert.Equal("Group 3", studentGroup.GetProperty("name").GetString());
        Assert.Equal(created.GetProperty("id").GetInt32(), studentGroup.GetProperty("id").GetInt32());
    }

    [Fact]
    public async Task List_is_sorted_by_name()
    {
        await CreateStudentGroupAsync("Group 4");
        await CreateStudentGroupAsync("Group 3");

        var studentGroups = await ListStudentGroupsAsync();

        Assert.Equal(["Group 3", "Group 4"], studentGroups.Select(studentGroup => studentGroup.GetProperty("name").GetString()));
    }

    [Fact]
    public async Task Empty_list_when_no_student_group_exists()
    {
        Assert.Empty(await ListStudentGroupsAsync());
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task<JsonElement> CreateStudentGroupAsync(string name)
    {
        var response = await _client.PostAsJsonAsync("/api/student-groups", new { name });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private async Task<List<JsonElement>> ListStudentGroupsAsync()
    {
        var response = await _client.GetAsync("/api/student-groups");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }
}
