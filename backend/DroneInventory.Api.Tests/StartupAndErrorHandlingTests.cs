using DroneInventory.Api.Common;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

public sealed class StartupAndErrorHandlingTests
{
    [Fact]
    public void Api_does_not_start_without_a_connection_string()
    {
        using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, configuration) => configuration.Sources.Clear()));

        var exception = Assert.Throws<InvalidOperationException>(() => factory.Services);

        Assert.Contains("DroneInventory", exception.Message);
    }

    [Fact]
    public async Task Handler_keeps_the_status_code_of_the_rejected_request()
    {
        using var factory = new DroneInventoryApiFactory();
        var handler = ActivatorUtilities.CreateInstance<BadRequestExceptionHandler>(factory.Services);
        var httpContext = new DefaultHttpContext { RequestServices = factory.Services };
        httpContext.Response.Body = new MemoryStream();

        var handled = await handler.TryHandleAsync(
            httpContext,
            new BadHttpRequestException("Too large.", StatusCodes.Status413PayloadTooLarge),
            CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status413PayloadTooLarge, httpContext.Response.StatusCode);
    }

    [Fact]
    public async Task Handler_leaves_other_errors_alone()
    {
        using var factory = new DroneInventoryApiFactory();
        var handler = ActivatorUtilities.CreateInstance<BadRequestExceptionHandler>(factory.Services);

        var handled = await handler.TryHandleAsync(
            new DefaultHttpContext { RequestServices = factory.Services },
            new InvalidOperationException("Something else."),
            CancellationToken.None);

        Assert.False(handled);
    }
}
