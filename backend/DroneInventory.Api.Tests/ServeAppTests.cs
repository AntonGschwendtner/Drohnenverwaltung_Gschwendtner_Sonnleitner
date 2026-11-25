using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;

namespace DroneInventory.Api.Tests;

/// <summary>
/// The backend serves the built Angular app next to the REST API, as in the container (REQ-032).
/// A temporary web root stands in for the built app.
/// </summary>
public sealed class ServeAppTests : IDisposable
{
    private const string IndexHtml = "<!doctype html><html><body><app-root>drone lending app</app-root></body></html>";

    private readonly string _webRoot = Directory.CreateTempSubdirectory("drone-app-").FullName;
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public ServeAppTests()
    {
        File.WriteAllText(Path.Combine(_webRoot, "index.html"), IndexHtml);
        File.WriteAllText(Path.Combine(_webRoot, "main-ABC123.js"), "console.log('app');");
        _client = _factory.WithWebHostBuilder(builder => builder.UseWebRoot(_webRoot)).CreateClient();
    }

    [Fact]
    public async Task Open_the_app()
    {
        var response = await _client.GetAsync("/");

        await AssertIsAppAsync(response);
    }

    [Theory]
    [InlineData("/drones/7")]
    [InlineData("/loans?drone=7")]
    [InlineData("/student-groups")]
    [InlineData("/history")]
    public async Task Open_a_page_directly(string address)
    {
        var response = await _client.GetAsync(address);

        await AssertIsAppAsync(response);
    }

    [Fact]
    public async Task Files_of_the_app_are_served()
    {
        var response = await _client.GetAsync("/main-ABC123.js");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("console.log('app');", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Missing_file_is_not_answered_with_the_app()
    {
        var response = await _client.GetAsync("/missing-file.js");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("/api/unknown")]
    [InlineData("/api/drones/7/unknown")]
    public async Task Unknown_API_address(string address)
    {
        var response = await _client.GetAsync(address);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.NotEqual("text/html", response.Content.Headers.ContentType?.MediaType);
        Assert.DoesNotContain("drone lending app", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task The_REST_API_works_next_to_the_app()
    {
        var created = await _client.PostAsJsonAsync("/api/drones", new { name = "TELLO-07", description = "x" });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        var drones = await _client.GetFromJsonAsync<List<JsonElement>>("/api/drones");

        Assert.Equal("TELLO-07", Assert.Single(drones!).GetProperty("name").GetString());
    }

    [Fact]
    public async Task Without_the_built_app_nothing_changes()
    {
        using var factory = new DroneInventoryApiFactory();
        using var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/drones/7")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/unknown")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/drones")).StatusCode);
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
        Directory.Delete(_webRoot, recursive: true);
    }

    private static async Task AssertIsAppAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("drone lending app", await response.Content.ReadAsStringAsync());
    }
}
