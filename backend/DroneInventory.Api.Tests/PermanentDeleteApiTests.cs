using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of "Delete student group permanently" and of the history after it, "Group deleted, history kept" and
/// "Group deleted with its history" (REQ-033).
/// </summary>
public sealed class PermanentDeleteApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public PermanentDeleteApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Keep_the_history()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await CreateAsync($"/api/student-groups/{groupId}/members", new { name = "Anna Huber" });
        await ReturnedLoanAsync("TELLO-07", groupId);
        await _client.DeleteAsync($"/api/student-groups/{groupId}");

        var response = await _client.DeleteAsync($"/api/student-groups/{groupId}/permanent?history=keep");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync($"/api/student-groups/{groupId}")).StatusCode);
        Assert.Empty(await ListAsync("/api/student-groups/trash"));
        Assert.Equal(0, await CountAsync(db => db.StudentGroupMembers));

        // Scenario "Group deleted, history kept" of the loan history.
        var loan = Assert.Single(await ListAsync("/api/loans?status=Returned"));
        Assert.Equal("TELLO-07", loan.GetProperty("droneName").GetString());
        Assert.Equal("Group 3", loan.GetProperty("studentGroupName").GetString());
        Assert.Equal(JsonValueKind.Null, loan.GetProperty("studentGroupId").ValueKind);
        var csv = await _client.GetStringAsync("/api/loans/export");
        Assert.Contains("Group 3", csv);
        Assert.Contains("TELLO-07", csv);
    }

    [Fact]
    public async Task Name_is_free_again_after_the_permanent_delete()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await _client.DeleteAsync($"/api/student-groups/{groupId}");
        await _client.DeleteAsync($"/api/student-groups/{groupId}/permanent?history=keep");

        var response = await _client.PostAsJsonAsync("/api/student-groups", new { name = "Group 3" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Delete_with_the_history()
    {
        var group3 = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        var group4 = await CreateAsync("/api/student-groups", new { name = "Group 4" });
        await CreateAsync($"/api/student-groups/{group3}/members", new { name = "Anna Huber" });
        await ReturnedLoanAsync("TELLO-07", group3);
        await ReturnedLoanAsync("TELLO-08", group4);
        await _client.DeleteAsync($"/api/student-groups/{group3}");

        var response = await _client.DeleteAsync($"/api/student-groups/{group3}/permanent?history=delete");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync($"/api/student-groups/{group3}")).StatusCode);
        Assert.Equal(0, await CountAsync(db => db.StudentGroupMembers));

        // Scenario "Group deleted with its history" of the loan history: only the loan of Group 4 is left.
        var loan = Assert.Single(await ListAsync("/api/loans?status=Returned"));
        Assert.Equal("TELLO-08", loan.GetProperty("droneName").GetString());
        Assert.Equal("Group 4", loan.GetProperty("studentGroupName").GetString());
        Assert.Equal(1, await CountAsync(db => db.Loans));
        Assert.Equal(2, await CountAsync(db => db.Set<Domain.LoanItem>()));
    }

    [Fact]
    public async Task Group_is_not_in_the_trash()
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 4" });

        var response = await _client.DeleteAsync($"/api/student-groups/{groupId}/permanent?history=keep");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Single(await ListAsync("/api/student-groups"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("?history=")]
    [InlineData("?history=maybe")]
    public async Task No_choice_about_the_history(string query)
    {
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await _client.DeleteAsync($"/api/student-groups/{groupId}");

        var response = await _client.DeleteAsync($"/api/student-groups/{groupId}/permanent{query}");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Single(await ListAsync("/api/student-groups/trash"));
    }

    [Fact]
    public async Task Group_in_the_trash_still_has_a_drone()
    {
        var droneId = await CreateAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        var groupId = await CreateAsync("/api/student-groups", new { name = "Group 3" });
        await CreateAsync("/api/loans", new { droneId, studentGroupId = groupId });

        // The rare race: the group reached the trash while it still had a drone.
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
            var group = await dbContext.StudentGroups.SingleAsync(g => g.Id == groupId);
            group.DeletedAt = new DateOnly(2026, 8, 19);
            await dbContext.SaveChangesAsync();
        }

        var keep = await _client.DeleteAsync($"/api/student-groups/{groupId}/permanent?history=keep");
        var delete = await _client.DeleteAsync($"/api/student-groups/{groupId}/permanent?history=delete");

        Assert.Equal(HttpStatusCode.Conflict, keep.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, delete.StatusCode);
        Assert.Contains("TELLO-07", await keep.Content.ReadAsStringAsync());
        var loan = Assert.Single(await ListAsync("/api/loans?status=Active"));
        Assert.Equal(groupId, loan.GetProperty("studentGroupId").GetInt32());
        Assert.Single(await ListAsync("/api/student-groups/trash"));
    }

    [Fact]
    public async Task Unknown_student_group()
    {
        var response = await _client.DeleteAsync("/api/student-groups/999/permanent?history=keep");

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.NotFound);
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task ReturnedLoanAsync(string droneName, int groupId)
    {
        var droneId = await CreateAsync("/api/drones", new { name = droneName, description = "x" });
        var response = await _client.PostAsJsonAsync("/api/loans", new
        {
            droneId,
            studentGroupId = groupId,
            items = new[] { new { type = "Battery", quantity = 2 }, new { type = "Propeller", quantity = 4 } },
        });
        var loanId = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
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

    private async Task<int> CountAsync<T>(Func<DroneInventoryDbContext, IQueryable<T>> set)
    {
        using var scope = _factory.Services.CreateScope();
        return await set(scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>()).CountAsync();
    }
}
