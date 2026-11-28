using System.Text.Json.Serialization;
using DroneInventory.Api.Admin;
using DroneInventory.Api.Common;
using DroneInventory.Api.Data;
using DroneInventory.Api.Defects;
using DroneInventory.Api.Drones;
using DroneInventory.Api.Loans;
using DroneInventory.Api.Reservations;
using DroneInventory.Api.Statistics;
using DroneInventory.Api.StudentGroups;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<BadRequestExceptionHandler>();
builder.Services.Configure<RouteHandlerOptions>(options => options.ThrowOnBadRequest = true);
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddDbContext<DroneInventoryDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DroneInventory")
        ?? throw new InvalidOperationException("The connection string \"DroneInventory\" is missing.")));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<DroneService>();
builder.Services.AddScoped<StudentGroupService>();
builder.Services.AddScoped<LoanService>();
builder.Services.AddScoped<AdminService>();
builder.Services.AddScoped<ReservationService>();
builder.Services.AddScoped<StatisticsService>();
builder.Services.AddScoped<DefectService>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
    await dbContext.Database.MigrateAsync();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Before the exception handler, so that its messages use the language of the request as well.
app.UseRequestLocalization(new RequestLocalizationOptions()
    .SetDefaultCulture(Messages.English)
    .AddSupportedCultures(Messages.English, Messages.German)
    .AddSupportedUICultures(Messages.English, Messages.German));
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseHttpsRedirection();

// The container serves the built Angular app from wwwroot next to the API (REQ-032). In development there is no
// wwwroot; the Angular dev server serves the app and nothing below takes effect.
var serveApp = app.Environment.WebRootFileProvider.GetFileInfo("index.html").Exists;
if (serveApp)
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

app.MapDroneEndpoints();
app.MapStudentGroupEndpoints();
app.MapLoanEndpoints();
app.MapAdminEndpoints();
app.MapReservationEndpoints();
app.MapStatisticsEndpoints();
app.MapDefectEndpoints();

// For monitoring or a reverse proxy in front of the container (REQ-041): healthy when the database opens.
app.MapGet("/api/health", async (DroneInventoryDbContext dbContext, CancellationToken cancellationToken) =>
    await dbContext.Database.CanConnectAsync(cancellationToken)
        ? Results.Ok(new { Status = "healthy" })
        : Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, detail: Messages.Unhealthy));

if (serveApp)
{
    // Addresses of the app such as /drones/7 or /loans?drone=7 (QR codes, bookmarks) open the app, which then routes.
    // Only for GET and HEAD and never below /api: unknown API addresses stay 404, a wrong method on an API route
    // stays 405, and paths with a file extension stay with the static files.
    app.MapFallbackToFile("{**path:nonfile:regex(^(?!api(/|$)).*$)}", "index.html")
        .WithMetadata(new HttpMethodMetadata([HttpMethods.Get, HttpMethods.Head]));
}

app.Run();
