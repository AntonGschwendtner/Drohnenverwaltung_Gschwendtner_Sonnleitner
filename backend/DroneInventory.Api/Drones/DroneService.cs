using DroneInventory.Api.Common;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Drones;

public class DroneService(DroneInventoryDbContext dbContext)
{
    public async Task<IReadOnlyList<DroneResponse>> ListAsync(CancellationToken cancellationToken) =>
        await dbContext.Drones
            .OrderBy(drone => drone.Name)
            .Select(drone => new DroneResponse(
                drone.Id,
                drone.Name,
                dbContext.Loans.Any(loan => loan.DroneId == drone.Id && loan.Status == LoanStatus.Active)
                    ? DroneStatus.Loaned
                    : DroneStatus.Available,
                drone.Description))
            .ToListAsync(cancellationToken);

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
