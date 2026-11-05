using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

public static class ApiResponseAssert
{
    /// <summary>
    /// Checks that a rejection has the expected status code and a readable message for the frontend.
    /// </summary>
    public static async Task IsProblemAsync(HttpResponseMessage response, HttpStatusCode expectedStatusCode)
    {
        Assert.Equal(expectedStatusCode, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(string.IsNullOrWhiteSpace(problem.GetProperty("detail").GetString()));
    }
}
