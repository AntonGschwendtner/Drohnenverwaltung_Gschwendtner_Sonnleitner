using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of "Remove member" and of members and leader in "List student groups" and "Student group details" (REQ-031).
/// </summary>
public sealed class MemberListAndRemoveApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public MemberListAndRemoveApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Remove_a_member()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var anna = await AddMemberAsync(groupId, "Anna Huber");
        await AddMemberAsync(groupId, "Ben Wagner");

        var response = await _client.DeleteAsync($"/api/student-groups/{groupId}/members/{anna}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(["Ben Wagner"], MemberNames(await GetGroupAsync(groupId)));
    }

    [Fact]
    public async Task Member_of_a_group_with_loans()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var loanId = await CreateAsync("/api/loans", new { droneId, studentGroupId = groupId });
        var anna = await AddMemberAsync(groupId, "Anna Huber");

        var response = await _client.DeleteAsync($"/api/student-groups/{groupId}/members/{anna}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(MemberNames(await GetGroupAsync(groupId)));
        var loan = Assert.Single(await ListAsync("/api/loans?status=Active"));
        Assert.Equal(loanId, loan.GetProperty("id").GetInt32());
        Assert.Equal("Group 3", loan.GetProperty("studentGroupName").GetString());
    }

    [Fact]
    public async Task Unknown_member()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });

        var response = await _client.DeleteAsync($"/api/student-groups/{groupId}/members/999");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Member_of_another_group_is_not_found()
    {
        var group3 = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var group4 = await CreateAsync("/api/student-groups", new { name = "Group 4" });
        var ben = await AddMemberAsync(group4, "Ben Wagner");

        var response = await _client.DeleteAsync($"/api/student-groups/{group3}/members/{ben}");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
        Assert.Equal(["Ben Wagner"], MemberNames(await GetGroupAsync(group4)));
    }

    [Fact]
    public async Task Unknown_student_group_when_removing()
    {
        var response = await _client.DeleteAsync("/api/student-groups/999/members/1");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Members_and_leader_in_the_list()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await AddMemberAsync(groupId, "Ben Wagner");
        var anna = await AddMemberAsync(groupId, "Anna Huber");
        await MakeLeaderAsync(anna);

        var group = Assert.Single(await ListAsync("/api/student-groups"));

        Assert.Equal(["Anna Huber", "Ben Wagner"], MemberNames(group));
        Assert.Equal("Anna Huber", group.GetProperty("leaderName").GetString());
        var members = group.GetProperty("members").EnumerateArray().ToList();
        Assert.True(members[0].GetProperty("isLeader").GetBoolean());
        Assert.False(members[1].GetProperty("isLeader").GetBoolean());
    }

    [Fact]
    public async Task Group_without_a_leader()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 4" });
        await AddMemberAsync(groupId, "Ben Wagner");

        var group = Assert.Single(await ListAsync("/api/student-groups"));

        Assert.Equal(JsonValueKind.Null, group.GetProperty("leaderName").ValueKind);
        Assert.Equal(["Ben Wagner"], MemberNames(group));
    }

    [Fact]
    public async Task Group_with_members()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await AddMemberAsync(groupId, "Ben Wagner");
        var anna = await AddMemberAsync(groupId, "anna Huber");
        await MakeLeaderAsync(anna);

        var group = await GetGroupAsync(groupId);

        // Alphabetical ignoring upper and lower case.
        Assert.Equal(["anna Huber", "Ben Wagner"], MemberNames(group));
        Assert.Equal("anna Huber", group.GetProperty("leaderName").GetString());
    }

    [Fact]
    public async Task New_group_has_no_members()
    {
        var response = await _client.PostAsJsonAsync("/api/student-groups", new { name = "Group 5" });

        var group = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Empty(MemberNames(group));
        Assert.Equal(JsonValueKind.Null, group.GetProperty("leaderName").ValueKind);
    }

    [Fact]
    public async Task Renaming_keeps_the_members()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Grup 3" });
        await AddMemberAsync(groupId, "Anna Huber");

        var response = await _client.PutAsJsonAsync($"/api/student-groups/{groupId}", new { name = "Group 3" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(["Anna Huber"], MemberNames(await response.Content.ReadFromJsonAsync<JsonElement>()));
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private static string[] MemberNames(JsonElement group) =>
        group.GetProperty("members").EnumerateArray().Select(member => member.GetProperty("name").GetString() ?? string.Empty).ToArray();

    private async Task<int> CreateAsync(string url, object body)
    {
        var response = await _client.PostAsJsonAsync(url, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    private Task<int> AddMemberAsync(int groupId, string name) =>
        CreateAsync($"/api/student-groups/{groupId}/members", new { name });

    private async Task MakeLeaderAsync(int memberId)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        var member = await dbContext.StudentGroupMembers.SingleAsync(m => m.Id == memberId);
        member.IsLeader = true;
        await dbContext.SaveChangesAsync();
    }

    private async Task<JsonElement> GetGroupAsync(int groupId)
    {
        var response = await _client.GetAsync($"/api/student-groups/{groupId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private async Task<List<JsonElement>> ListAsync(string url)
    {
        var response = await _client.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<JsonElement>>())!;
    }
}
