using DroneInventory.Api.Common;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Drones;

public class DroneService(DroneInventoryDbContext dbContext)
{
    public async Task<ServiceResult<DroneResponse>> CreateAsync(CreateDroneRequest request, CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            return ServiceResult<DroneResponse>.Invalid("A drone needs a name.");
        }

        if (await dbContext.Drones.AnyAsync(drone => drone.Name == name, cancellationToken))
        {
            return NameAlreadyExists(name);
        }

        var drone = new Drone { Name = name, Description = request.Description ?? string.Empty };
        dbContext.Drones.Add(drone);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.IsUniqueConstraintViolation())
        {
            return NameAlreadyExists(name);
        }

        return ServiceResult<DroneResponse>.Success(
            new DroneResponse(drone.Id, drone.Name, DroneStatus.Available, drone.Description));
    }

    private static ServiceResult<DroneResponse> NameAlreadyExists(string name) =>
        ServiceResult<DroneResponse>.Conflict($"A drone named \"{name}\" already exists.");
}
