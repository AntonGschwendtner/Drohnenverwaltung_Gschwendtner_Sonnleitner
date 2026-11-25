using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>Scenarios of the requirement "Group leader" and "Remove the group leader" (REQ-031).</summary>
public sealed class GroupLeaderApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public GroupLeaderApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Choose_a_group_leader()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var anna = await AddMemberAsync(groupId, "Anna Huber");

        var response = await SetLeaderAsync(groupId, anna);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var group = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Anna Huber", group.GetProperty("leaderName").GetString());
        Assert.Equal("Anna Huber", (await GetGroupAsync(groupId)).GetProperty("leaderName").GetString());
    }

    [Fact]
    public async Task Change_the_group_leader()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var anna = await AddMemberAsync(groupId, "Anna Huber");
        var ben = await AddMemberAsync(groupId, "Ben Wagner");
        await SetLeaderAsync(groupId, anna);

        var response = await SetLeaderAsync(groupId, ben);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var group = await GetGroupAsync(groupId);
        Assert.Equal("Ben Wagner", group.GetProperty("leaderName").GetString());
        Assert.Equal([("Anna Huber", false), ("Ben Wagner", true)], Members(group));
    }

    [Fact]
    public async Task Choosing_the_leader_again_keeps_it()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var anna = await AddMemberAsync(groupId, "Anna Huber");
        await SetLeaderAsync(groupId, anna);

        var response = await SetLeaderAsync(groupId, anna);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Anna Huber", (await GetGroupAsync(groupId)).GetProperty("leaderName").GetString());
    }

    [Fact]
    public async Task Clear_the_group_leader()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var anna = await AddMemberAsync(groupId, "Anna Huber");
        await SetLeaderAsync(groupId, anna);

        var response = await SetLeaderAsync(groupId, null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var group = await GetGroupAsync(groupId);
        Assert.Equal(JsonValueKind.Null, group.GetProperty("leaderName").ValueKind);
        Assert.Equal([("Anna Huber", false)], Members(group));
    }

    [Fact]
    public async Task Leader_from_another_group()
    {
        var group3 = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var group4 = await CreateAsync("/api/student-groups", new { name = "Group 4" });
        var anna = await AddMemberAsync(group3, "Anna Huber");
        var ben = await AddMemberAsync(group4, "Ben Wagner");
        await SetLeaderAsync(group3, anna);

        var response = await SetLeaderAsync(group3, ben);

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
        Assert.Equal("Anna Huber", (await GetGroupAsync(group3)).GetProperty("leaderName").GetString());
        Assert.Equal(JsonValueKind.Null, (await GetGroupAsync(group4)).GetProperty("leaderName").ValueKind);
    }

    [Fact]
    public async Task Unknown_student_group()
    {
        var response = await SetLeaderAsync(999, null);

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Remove_the_group_leader()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var anna = await AddMemberAsync(groupId, "Anna Huber");
        await AddMemberAsync(groupId, "Ben Wagner");
        await SetLeaderAsync(groupId, anna);

        var response = await _client.DeleteAsync($"/api/student-groups/{groupId}/members/{anna}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var group = await GetGroupAsync(groupId);
        Assert.Equal(JsonValueKind.Null, group.GetProperty("leaderName").ValueKind);
        Assert.Equal([("Ben Wagner", false)], Members(group));
    }

    [Fact]
    public async Task Two_leaders_at_the_same_time_leave_one_leader()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var ids = new List<int>();
        foreach (var name in new[] { "Anna Huber", "Ben Wagner", "Clara Berger", "David Koch" })
        {
            ids.Add(await AddMemberAsync(groupId, name));
        }

        var responses = await Task.WhenAll(ids.Select(id =>
            _factory.CreateClient().PutAsJsonAsync($"/api/student-groups/{groupId}/leader", new { memberId = id })));

        Assert.All(responses, response =>
            Assert.Contains(response.StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Conflict }));
        Assert.Single(Members(await GetGroupAsync(groupId)), member => member.IsLeader);
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private static (string Name, bool IsLeader)[] Members(JsonElement group) =>
        group.GetProperty("members").EnumerateArray()
            .Select(member => (member.GetProperty("name").GetString() ?? string.Empty, member.GetProperty("isLeader").GetBoolean()))
            .ToArray();

    private Task<HttpResponseMessage> SetLeaderAsync(int groupId, int? memberId) =>
        _client.PutAsJsonAsync($"/api/student-groups/{groupId}/leader", new { memberId });

    private async Task<int> CreateAsync(string url, object body)
    {
        var response = await _client.PostAsJsonAsync(url, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    private Task<int> AddMemberAsync(int groupId, string name) =>
        CreateAsync($"/api/student-groups/{groupId}/members", new { name });

    private async Task<JsonElement> GetGroupAsync(int groupId)
    {
        var response = await _client.GetAsync($"/api/student-groups/{groupId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}
