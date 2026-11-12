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
            .Select(ToResponse())
            .ToListAsync(cancellationToken);

    /// <summary>One drone in the same shape as an item of the list (REQ-018).</summary>
    public async Task<ServiceResult<DroneResponse>> GetAsync(int id, CancellationToken cancellationToken)
    {
        var drone = await dbContext.Drones
            .Where(drone => drone.Id == id)
            .Select(ToResponse())
            .SingleOrDefaultAsync(cancellationToken);

        return drone is null
            ? ServiceResult<DroneResponse>.NotFound(Messages.UnknownDrone(id))
            : ServiceResult<DroneResponse>.Success(drone);
    }

    // The status follows from the active loan and is computed in the query.
    private System.Linq.Expressions.Expression<Func<Drone, DroneResponse>> ToResponse() =>
        drone => new DroneResponse(
            drone.Id,
            drone.Name,
            dbContext.Loans.Any(loan => loan.DroneId == drone.Id && loan.Status == LoanStatus.Active)
                ? DroneStatus.Loaned
                : DroneStatus.Available,
            drone.Description);

    public async Task<ServiceResult<DroneResponse>> CreateAsync(CreateDroneRequest request, CancellationToken cancellationToken)
    {
        var (name, error) = await CheckNameAsync(request.Name, exceptId: null, cancellationToken);
        if (error is not null)
        {
            return error;
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

    /// <summary>
    /// Changes name and description with the same rules as creating (REQ-015). The status stays as it is,
    /// because it follows from the loans.
    /// </summary>
    public async Task<ServiceResult<DroneResponse>> UpdateAsync(int id, UpdateDroneRequest request, CancellationToken cancellationToken)
    {
        var drone = await dbContext.Drones.FindAsync([id], cancellationToken);
        if (drone is null)
        {
            return ServiceResult<DroneResponse>.NotFound(Messages.UnknownDrone(id));
        }

        var (name, error) = await CheckNameAsync(request.Name, exceptId: id, cancellationToken);
        if (error is not null)
        {
            return error;
        }

        drone.Name = name;
        drone.Description = request.Description ?? string.Empty;

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.IsUniqueConstraintViolation())
        {
            return NameAlreadyExists(name);
        }

        var isLoaned = await dbContext.Loans.AnyAsync(
            loan => loan.DroneId == id && loan.Status == LoanStatus.Active,
            cancellationToken);

        return ServiceResult<DroneResponse>.Success(new DroneResponse(
            drone.Id,
            drone.Name,
            isLoaned ? DroneStatus.Loaned : DroneStatus.Available,
            drone.Description));
    }

    /// <summary>
    /// Deletes a drone that never had a loan (REQ-016). A drone with any loan stays, so the history stays complete.
    /// </summary>
    public async Task<ServiceResult<bool>> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var drone = await dbContext.Drones.FindAsync([id], cancellationToken);
        if (drone is null)
        {
            return ServiceResult<bool>.NotFound(Messages.UnknownDrone(id));
        }

        if (await dbContext.Loans.AnyAsync(loan => loan.DroneId == id, cancellationToken))
        {
            return ServiceResult<bool>.Conflict(Messages.DroneHasLoans(drone.Name));
        }

        dbContext.Drones.Remove(drone);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.IsForeignKeyViolation())
        {
            // A loan was created after the check above; the database refuses the delete.
            return ServiceResult<bool>.Conflict(Messages.DroneHasLoans(drone.Name));
        }

        return ServiceResult<bool>.Success(true);
    }

    /// <summary>The name is required and unique. When editing, the drone itself may keep its name.</summary>
    private async Task<(string Name, ServiceResult<DroneResponse>? Error)> CheckNameAsync(
        string? requestedName,
        int? exceptId,
        CancellationToken cancellationToken)
    {
        var name = requestedName?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            return (string.Empty, ServiceResult<DroneResponse>.Invalid(Messages.DroneNeedsName));
        }

        var nameIsTaken = await dbContext.Drones.AnyAsync(
            drone => drone.Name == name && drone.Id != exceptId,
            cancellationToken);

        return nameIsTaken ? (name, NameAlreadyExists(name)) : (name, null);
    }

    private static ServiceResult<DroneResponse> NameAlreadyExists(string name) =>
        ServiceResult<DroneResponse>.Conflict(Messages.DroneNameExists(name));
}
