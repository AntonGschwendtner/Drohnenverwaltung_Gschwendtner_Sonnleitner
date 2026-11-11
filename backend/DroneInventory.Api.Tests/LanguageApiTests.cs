using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Rejection messages follow the Accept-Language header. The rules stay the same in every language.
/// </summary>
public sealed class LanguageApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public LanguageApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Messages_are_english_without_a_language()
    {
        await _client.PostAsJsonAsync("/api/drones", new { name = "TELLO-07" });

        var response = await _client.PostAsJsonAsync("/api/drones", new { name = "TELLO-07" });

        Assert.Equal("A drone named \"TELLO-07\" already exists.", await DetailAsync(response, HttpStatusCode.Conflict));
    }

    [Fact]
    public async Task Messages_are_german_when_german_is_requested()
    {
        await _client.PostAsJsonAsync("/api/drones", new { name = "TELLO-07" });

        var response = await SendAsync(HttpMethod.Post, "/api/drones", """{"name":"TELLO-07"}""", "de");

        Assert.Equal("Eine Drohne mit dem Namen „TELLO-07“ gibt es bereits.", await DetailAsync(response, HttpStatusCode.Conflict));
    }

    [Fact]
    public async Task Regional_german_is_german_too()
    {
        var response = await SendAsync(HttpMethod.Post, "/api/student-groups", """{"name":""}""", "de-AT,de;q=0.9,en;q=0.8");

        Assert.Equal("Eine Schülergruppe braucht einen Namen.", await DetailAsync(response, HttpStatusCode.BadRequest));
    }

    [Fact]
    public async Task Unsupported_language_falls_back_to_english()
    {
        var response = await SendAsync(HttpMethod.Post, "/api/student-groups", """{"name":""}""", "fr");

        Assert.Equal("A student group needs a name.", await DetailAsync(response, HttpStatusCode.BadRequest));
    }

    [Fact]
    public async Task Unreadable_request_is_german_too()
    {
        var response = await SendAsync(HttpMethod.Post, "/api/drones", "{not json", "de");

        Assert.Equal(
            "Die Anfrage konnte nicht gelesen werden. Prüfe, ob alle Werte das erwartete Format haben.",
            await DetailAsync(response, HttpStatusCode.BadRequest));
    }

    // Together with the German test above, this one fails on any machine language if the language is not
    // set before the exception handler runs.
    [Fact]
    public async Task Unreadable_request_is_english_when_english_is_requested()
    {
        var response = await SendAsync(HttpMethod.Post, "/api/drones", "{not json", "en");

        Assert.Equal(
            "The request could not be read. Check that all values have the expected format.",
            await DetailAsync(response, HttpStatusCode.BadRequest));
    }

    [Fact]
    public async Task Loan_and_return_messages_are_german()
    {
        var droneResponse = await _client.PostAsJsonAsync("/api/drones", new { name = "TELLO-07" });
        var groupResponse = await _client.PostAsJsonAsync("/api/student-groups", new { name = "Group 3" });
        var droneId = (await droneResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        var groupId = (await groupResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        var body = $$"""{"droneId":{{droneId}},"studentGroupId":{{groupId}}}""";
        await SendAsync(HttpMethod.Post, "/api/loans", body, "de");

        var secondLoan = await SendAsync(HttpMethod.Post, "/api/loans", body, "de");
        var negative = await SendAsync(
            HttpMethod.Post,
            "/api/loans",
            $$"""{"droneId":{{droneId}},"studentGroupId":{{groupId}},"items":[{"type":"Battery","quantity":-1}]}""",
            "de");
        var unknownLoan = await SendAsync(HttpMethod.Post, "/api/loans/999/return", null, "de");

        Assert.Equal("Die Drohne „TELLO-07“ ist bereits ausgeliehen.", await DetailAsync(secondLoan, HttpStatusCode.Conflict));
        Assert.Equal("Zubehörmengen dürfen nicht negativ sein.", await DetailAsync(negative, HttpStatusCode.BadRequest));
        Assert.Equal("Die Ausleihe mit der Id 999 gibt es nicht.", await DetailAsync(unknownLoan, HttpStatusCode.NotFound));
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private Task<HttpResponseMessage> SendAsync(HttpMethod method, string path, string? json, string language)
    {
        var request = new HttpRequestMessage(method, path);
        if (json is not null)
        {
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        }

        request.Headers.AcceptLanguage.ParseAdd(language);
        return _client.SendAsync(request);
    }

    private static async Task<string?> DetailAsync(HttpResponseMessage response, HttpStatusCode expectedStatusCode)
    {
        Assert.Equal(expectedStatusCode, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        return problem.GetProperty("detail").GetString();
    }
}
