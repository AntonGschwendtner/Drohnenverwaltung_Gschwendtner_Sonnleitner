using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using DroneInventory.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>Scenarios of the requirement "Add member" (REQ-031).</summary>
public sealed class AddMemberApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public AddMemberApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Add_a_member()
    {
        var groupId = await CreateGroupAsync("Group 3");

        var response = await AddAsync(groupId, "  Anna Huber ");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var member = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Anna Huber", member.GetProperty("name").GetString());
        Assert.False(member.GetProperty("isLeader").GetBoolean());
        Assert.Equal(
            $"/api/student-groups/{groupId}/members/{member.GetProperty("id").GetInt32()}",
            response.Headers.Location?.ToString());
        Assert.Equal(["Anna Huber"], await MemberNamesAsync(groupId));
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("""{"name":null}""")]
    [InlineData("""{"name":""}""")]
    [InlineData("""{"name":"   "}""")]
    public async Task Name_is_missing(string body)
    {
        var groupId = await CreateGroupAsync("Group 3");

        var response = await _client.PostAsync(
            $"/api/student-groups/{groupId}/members",
            new StringContent(body, Encoding.UTF8, "application/json"));

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Empty(await MemberNamesAsync(groupId));
    }

    [Fact]
    public async Task Name_is_too_long()
    {
        var groupId = await CreateGroupAsync("Group 3");

        var response = await AddAsync(groupId, new string('A', 101));

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Empty(await MemberNamesAsync(groupId));
    }

    [Fact]
    public async Task Name_with_100_characters_is_accepted()
    {
        var groupId = await CreateGroupAsync("Group 3");

        var response = await AddAsync(groupId, new string('A', 100));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Member_already_in_the_group()
    {
        var groupId = await CreateGroupAsync("Group 3");
        await AddAsync(groupId, "Anna Huber");

        var response = await AddAsync(groupId, "anna huber");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Equal(["Anna Huber"], await MemberNamesAsync(groupId));
    }

    [Fact]
    public async Task Same_name_in_another_group()
    {
        var group3 = await CreateGroupAsync("Group 3");
        var group4 = await CreateGroupAsync("Group 4");
        await AddAsync(group3, "Anna Huber");

        var response = await AddAsync(group4, "Anna Huber");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(["Anna Huber"], await MemberNamesAsync(group3));
        Assert.Equal(["Anna Huber"], await MemberNamesAsync(group4));
    }

    [Fact]
    public async Task Unknown_student_group()
    {
        var response = await AddAsync(999, "Anna Huber");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Same_member_at_the_same_time_stores_one_member()
    {
        var groupId = await CreateGroupAsync("Group 3");

        var responses = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ =>
            _factory.CreateClient().PostAsJsonAsync($"/api/student-groups/{groupId}/members", new { name = "Anna Huber" })));

        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Created);
        Assert.All(
            responses.Where(response => response.StatusCode != HttpStatusCode.Created),
            response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
        Assert.Equal(["Anna Huber"], await MemberNamesAsync(groupId));
    }

    [Fact]
    public async Task Message_in_German()
    {
        var groupId = await CreateGroupAsync("Group 3");
        await AddAsync(groupId, "Anna Huber");
        using var request = new HttpRequestMessage(HttpMethod.Post, $"/api/student-groups/{groupId}/members")
        {
            Content = JsonContent.Create(new { name = "ANNA HUBER" }),
        };
        request.Headers.AcceptLanguage.Add(new StringWithQualityHeaderValue("de"));

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("„ANNA HUBER“ ist bereits Mitglied von „Group 3“.", problem.GetProperty("detail").GetString());
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task<int> CreateGroupAsync(string name)
    {
        var response = await _client.PostAsJsonAsync("/api/student-groups", new { name });
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    private Task<HttpResponseMessage> AddAsync(int groupId, string name) =>
        _client.PostAsJsonAsync($"/api/student-groups/{groupId}/members", new { name });

    private async Task<string[]> MemberNamesAsync(int groupId)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        return await dbContext.StudentGroupMembers
            .Where(member => member.StudentGroupId == groupId)
            .Select(member => member.Name)
            .ToArrayAsync();
    }
}
