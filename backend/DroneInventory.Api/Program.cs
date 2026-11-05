using System.Text.Json.Serialization;
using DroneInventory.Api.Common;
using DroneInventory.Api.Data;
using DroneInventory.Api.Drones;
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
    options.UseSqlite(builder.Configuration.GetConnectionString("DroneInventory")));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<DroneService>();

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

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseHttpsRedirection();

app.MapDroneEndpoints();

app.Run();
