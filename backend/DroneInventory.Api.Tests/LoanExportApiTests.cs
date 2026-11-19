using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Scenarios of the requirement "Export loan history" (REQ-025).
/// </summary>
public sealed class LoanExportApiTests : IDisposable
{
    private readonly DroneInventoryApiFactory _factory = new();
    private readonly HttpClient _client;

    public LoanExportApiTests() => _client = _factory.CreateClient();

    [Fact]
    public async Task Export_the_history()
    {
        var loanId = await LoanAsync("Group 3", "TELLO-07", 4, 8);
        _factory.Time.SetNow(new DateTimeOffset(2026, 8, 26, 12, 0, 0, TimeSpan.Zero));
        await _client.PostAsync($"/api/loans/{loanId}/return", null);

        var response = await _client.GetAsync("/api/loans/export");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("loan-history-2026-08-26.csv", response.Content.Headers.ContentDisposition?.FileName?.Trim('"'));
        var lines = await LinesAsync(response);
        Assert.Equal("Student group;Drone;Batteries;Propellers;Loan date;Return date", lines[0]);
        Assert.Equal("Group 3;TELLO-07;4;8;19.08.2026;26.08.2026", lines[1]);
        Assert.Equal(2, lines.Length);
    }

    [Fact]
    public async Task Export_without_returned_loans()
    {
        await LoanAsync("Group 3", "TELLO-07", 4, 8);

        var lines = await LinesAsync(await _client.GetAsync("/api/loans/export"));

        Assert.Equal(["Student group;Drone;Batteries;Propellers;Loan date;Return date"], lines);
    }

    [Fact]
    public async Task Value_with_a_separator()
    {
        var loanId = await LoanAsync("Gruppe 3; Robotik", "TELLO \"Sieben\"", 0, 0);
        await _client.PostAsync($"/api/loans/{loanId}/return", null);

        var lines = await LinesAsync(await _client.GetAsync("/api/loans/export"));

        Assert.Equal("\"Gruppe 3; Robotik\";\"TELLO \"\"Sieben\"\"\";0;0;19.08.2026;19.08.2026", lines[1]);
    }

    [Fact]
    public async Task Value_with_a_line_break_and_a_formula()
    {
        var loanId = await LoanAsync("=SUM(A1)", "TELLO\nZwei", 0, 0);
        await _client.PostAsync($"/api/loans/{loanId}/return", null);

        var response = await _client.GetAsync("/api/loans/export");
        var text = System.Text.Encoding.UTF8.GetString(await response.Content.ReadAsByteArrayAsync());

        Assert.Contains("'=SUM(A1);\"TELLO\nZwei\";0;0;", text);
    }

    [Fact]
    public async Task Header_and_umlauts_in_German()
    {
        var loanId = await LoanAsync("Gruppe Größe", "TELLO-07", 1, 2);
        await _client.PostAsync($"/api/loans/{loanId}/return", null);
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/loans/export");
        request.Headers.AcceptLanguage.ParseAdd("de");

        var response = await _client.SendAsync(request);
        var bytes = await response.Content.ReadAsByteArrayAsync();

        Assert.Equal(Encoding.UTF8.GetPreamble(), bytes[..3]);
        var lines = await LinesAsync(response);
        Assert.Equal("Schülergruppe;Drohne;Akkus;Propeller;Ausleihdatum;Rückgabedatum", lines[0]);
        Assert.StartsWith("Gruppe Größe;", lines[1]);
    }

    [Fact]
    public async Task Newest_return_comes_first()
    {
        var first = await LoanAsync("Group 3", "TELLO-07", 0, 0);
        await _client.PostAsync($"/api/loans/{first}/return", null);
        _factory.Time.SetNow(new DateTimeOffset(2026, 8, 20, 12, 0, 0, TimeSpan.Zero));
        var second = await LoanAsync("Group 4", "TELLO-08", 0, 0);
        await _client.PostAsync($"/api/loans/{second}/return", null);

        var lines = await LinesAsync(await _client.GetAsync("/api/loans/export"));

        Assert.StartsWith("Group 4;", lines[1]);
        Assert.StartsWith("Group 3;", lines[2]);
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    private static async Task<string[]> LinesAsync(HttpResponseMessage response)
    {
        var bytes = await response.Content.ReadAsByteArrayAsync();
        var text = Encoding.UTF8.GetString(bytes).TrimStart('﻿');
        return text.Split("\r\n", StringSplitOptions.RemoveEmptyEntries);
    }

    private async Task<int> LoanAsync(string group, string drone, int batteries, int propellers)
    {
        var droneId = (await (await _client.PostAsJsonAsync("/api/drones", new { name = drone, description = "x" }))
            .Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        var groupId = (await (await _client.PostAsJsonAsync("/api/student-groups", new { name = group }))
            .Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        var response = await _client.PostAsJsonAsync("/api/loans", new
        {
            droneId,
            studentGroupId = groupId,
            items = new[] { new { type = "Battery", quantity = batteries }, new { type = "Propeller", quantity = propellers } },
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }
}
