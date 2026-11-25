using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirements "Delete student group", "No changes in the trash" and of names and loans of groups
/// in the trash (REQ-017, REQ-033). Deleting moves a group into the trash.
/// </summary>
public sealed class DeleteStudentGroupApiTests : IDisposable
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DroneInventoryApiFactory.FixedNow.LocalDateTime);

    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public DeleteStudentGroupApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Delete_a_group_without_loans()
    {
        await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 4" });

        var response = await _client.DeleteAsync($"/api/student-groups/{groupId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(["Group 3"], await ListedNamesAsync());
        Assert.Equal(Today, await DeletedAtAsync(groupId));
    }

    [Fact]
    public async Task Delete_a_group_with_members()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 4" });
        await CreateAsync($"/api/student-groups/{groupId}/members", new { name = "Anna Huber" });

        var response = await _client.DeleteAsync($"/api/student-groups/{groupId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.NotNull(await DeletedAtAsync(groupId));
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        Assert.Equal("Anna Huber", (await dbContext.StudentGroupMembers.SingleAsync(m => m.StudentGroupId == groupId)).Name);
    }

    [Fact]
    public async Task Group_has_loans()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var loanId = await CreateAsync("/api/loans", new { droneId, studentGroupId = groupId });
        Assert.Equal(HttpStatusCode.OK, (await _client.PostAsync($"/api/loans/{loanId}/return", null)).StatusCode);

        var response = await _client.DeleteAsync($"/api/student-groups/{groupId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await ListedNamesAsync());
        Assert.NotNull(await DeletedAtAsync(groupId));
        var loan = Assert.Single(await ListAsync("/api/loans?status=Returned"));
        Assert.Equal("Group 3", loan.GetProperty("studentGroupName").GetString());
        Assert.Equal(groupId, loan.GetProperty("studentGroupId").GetInt32());
    }

    [Fact]
    public async Task Group_has_an_active_loan()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await CreateAsync("/api/loans", new { droneId, studentGroupId = groupId });

        var response = await _client.DeleteAsync($"/api/student-groups/{groupId}");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("TELLO-07", await DetailAsync(response));
        Assert.Equal(["Group 3"], await ListedNamesAsync());
        Assert.Null(await DeletedAtAsync(groupId));
    }

    [Fact]
    public async Task Group_is_already_in_the_trash()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await _client.DeleteAsync($"/api/student-groups/{groupId}");
        _factory.Time.SetNow(DroneInventoryApiFactory.FixedNow.AddDays(3));

        var response = await _client.DeleteAsync($"/api/student-groups/{groupId}");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
        Assert.Equal(Today, await DeletedAtAsync(groupId));
    }

    [Fact]
    public async Task Unknown_student_group()
    {
        var response = await _client.DeleteAsync("/api/student-groups/999");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Group_in_the_trash_is_not_listed()
    {
        var group3 = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await CreateAsync("/api/student-groups", new { name = "Group 4" });

        await _client.DeleteAsync($"/api/student-groups/{group3}");

        Assert.Equal(["Group 4"], await ListedNamesAsync());
    }

    [Fact]
    public async Task Name_of_a_group_in_the_trash()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await _client.DeleteAsync($"/api/student-groups/{groupId}");

        var response = await _client.PostAsJsonAsync("/api/student-groups", new { name = "Group 3" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("trash", await DetailAsync(response));
    }

    [Fact]
    public async Task Name_of_a_group_in_the_trash_when_renaming()
    {
        var group3 = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var group4 = await CreateAsync("/api/student-groups", new { name = "Group 4" });
        await _client.DeleteAsync($"/api/student-groups/{group3}");

        var response = await _client.PutAsJsonAsync($"/api/student-groups/{group4}", new { name = "Group 3" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("trash", await DetailAsync(response));
        Assert.Equal(["Group 4"], await ListedNamesAsync());
    }

    [Fact]
    public async Task Rename_a_group_in_the_trash()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await _client.DeleteAsync($"/api/student-groups/{groupId}");

        var response = await _client.PutAsJsonAsync($"/api/student-groups/{groupId}", new { name = "Group 33" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("trash", await DetailAsync(response));
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        Assert.Equal("Group 3", (await dbContext.StudentGroups.SingleAsync(g => g.Id == groupId)).Name);
    }

    [Fact]
    public async Task Change_the_members_of_a_group_in_the_trash()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var anna = await CreateAsync($"/api/student-groups/{groupId}/members", new { name = "Anna Huber" });
        await _client.DeleteAsync($"/api/student-groups/{groupId}");

        var add = await _client.PostAsJsonAsync($"/api/student-groups/{groupId}/members", new { name = "Ben Wagner" });
        var remove = await _client.DeleteAsync($"/api/student-groups/{groupId}/members/{anna}");
        var leader = await _client.PutAsJsonAsync($"/api/student-groups/{groupId}/leader", new { memberId = anna });

        Assert.Equal(HttpStatusCode.Conflict, add.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, remove.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, leader.StatusCode);
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        var member = await dbContext.StudentGroupMembers.SingleAsync(m => m.StudentGroupId == groupId);
        Assert.Equal("Anna Huber", member.Name);
        Assert.False(member.IsLeader);
    }

    [Fact]
    public async Task Loan_for_a_group_in_the_trash()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await _client.DeleteAsync($"/api/student-groups/{groupId}");

        var response = await _client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = groupId });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("trash", await DetailAsync(response));
        Assert.Empty(await ListAsync("/api/loans?status=Active"));
        var drone = Assert.Single(await ListAsync("/api/drones"));
        Assert.Equal("Available", drone.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Message_is_german_when_german_is_requested()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await CreateAsync("/api/loans", new { droneId, studentGroupId = groupId });

        using var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/student-groups/{groupId}");
        request.Headers.AcceptLanguage.ParseAdd("de");
        var response = await _client.SendAsync(request);

        Assert.Equal("„Group 3“ hat noch „TELLO-07“. Gib die Drohne zuerst zurück.", await DetailAsync(response));
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

    private async Task<string[]> ListedNamesAsync() =>
        (await ListAsync("/api/student-groups")).Select(group => group.GetProperty("name").GetString() ?? string.Empty).ToArray();

    private async Task<DateOnly?> DeletedAtAsync(int groupId)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        return (await dbContext.StudentGroups.SingleAsync(g => g.Id == groupId)).DeletedAt;
    }

    private static async Task<string> DetailAsync(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("detail").GetString() ?? string.Empty;
}
