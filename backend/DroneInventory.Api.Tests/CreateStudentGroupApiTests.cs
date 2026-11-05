using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using DroneInventory.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirement "Create student group" (REQ-003).
/// </summary>
public sealed class CreateStudentGroupApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public CreateStudentGroupApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Create_a_student_group()
    {
        var response = await _client.PostAsJsonAsync("/api/student-groups", new { name = "Group 3" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var studentGroup = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Group 3", studentGroup.GetProperty("name").GetString());
        Assert.Equal($"/api/student-groups/{studentGroup.GetProperty("id").GetInt32()}", response.Headers.Location?.ToString());

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        Assert.Equal("Group 3", (await dbContext.StudentGroups.SingleAsync()).Name);
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("""{"name":null}""")]
    [InlineData("""{"name":""}""")]
    [InlineData("""{"name":"   "}""")]
    public async Task Name_is_missing(string body)
    {
        var response = await _client.PostAsync("/api/student-groups", new StringContent(body, Encoding.UTF8, "application/json"));

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.BadRequest);
        await AssertStudentGroupCountAsync(0);
    }

    [Fact]
    public async Task Name_already_exists()
    {
        await _client.PostAsJsonAsync("/api/student-groups", new { name = "Group 3" });

        var response = await _client.PostAsJsonAsync("/api/student-groups", new { name = "Group 3" });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
        await AssertStudentGroupCountAsync(1);
    }

    [Fact]
    public async Task Name_is_compared_without_surrounding_spaces()
    {
        await _client.PostAsJsonAsync("/api/student-groups", new { name = "Group 3" });

        var response = await _client.PostAsJsonAsync("/api/student-groups", new { name = " Group 3  " });

        await ApiResponseAssert.IsProblemAsync(response, HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Same_name_at_the_same_time_stores_one_student_group()
    {
        var requests = Enumerable.Range(0, 8)
            .Select(_ => _factory.CreateClient().PostAsJsonAsync("/api/student-groups", new { name = "Group 3" }));

        var responses = await Task.WhenAll(requests);

        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Created);
        Assert.All(
            responses.Where(response => response.StatusCode != HttpStatusCode.Created),
            response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
        await AssertStudentGroupCountAsync(1);
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private async Task AssertStudentGroupCountAsync(int expected)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        Assert.Equal(expected, await dbContext.StudentGroups.CountAsync());
    }
}
