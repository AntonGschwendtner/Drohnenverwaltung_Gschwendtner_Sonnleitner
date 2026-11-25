using DroneInventory.Api.Common;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Reservations;

/// <summary>Reserving a drone for a student group on one day, listing and cancelling (REQ-027, REQ-028).</summary>
public class ReservationService(DroneInventoryDbContext dbContext, TimeProvider timeProvider)
{
    /// <summary>Reservations of today and later, the earliest day first, then by drone name.</summary>
    public async Task<IReadOnlyList<ReservationResponse>> ListAsync(CancellationToken cancellationToken)
    {
        var today = Today();
        return await dbContext.Reservations
            .Where(reservation => reservation.Date >= today)
            .OrderBy(reservation => reservation.Date)
            .ThenBy(reservation => reservation.Drone!.Name)
            .Select(reservation => new ReservationResponse(
                reservation.Id,
                reservation.DroneId,
                reservation.Drone!.Name,
                reservation.StudentGroupId,
                reservation.StudentGroup!.Name,
                reservation.Date,
                reservation.Date == today,
                dbContext.Loans.Any(loan => loan.DroneId == reservation.DroneId && loan.Status == LoanStatus.Active)))
            .ToListAsync(cancellationToken);
    }

    public async Task<ServiceResult<ReservationResponse>> CreateAsync(CreateReservationRequest request, CancellationToken cancellationToken)
    {
        if (request.DroneId is not { } droneId)
        {
            return ServiceResult<ReservationResponse>.Invalid(Messages.ReservationNeedsDrone);
        }

        if (request.StudentGroupId is not { } studentGroupId)
        {
            return ServiceResult<ReservationResponse>.Invalid(Messages.ReservationNeedsStudentGroup);
        }

        if (request.Date is not { } date)
        {
            return ServiceResult<ReservationResponse>.Invalid(Messages.ReservationNeedsDate);
        }

        var today = Today();
        if (date < today)
        {
            return ServiceResult<ReservationResponse>.Invalid(Messages.ReservationInThePast);
        }

        var drone = await dbContext.Drones.FindAsync([droneId], cancellationToken);
        if (drone is null)
        {
            return ServiceResult<ReservationResponse>.Invalid(Messages.UnknownDrone(droneId));
        }

        if (drone.DeletedAt is not null)
        {
            return ServiceResult<ReservationResponse>.Conflict(Messages.DroneInTrash(drone.Name));
        }

        // A defective drone cannot be loaned, so it cannot be promised either (decision of 2026-11-12).
        if (drone.DefectNote is not null)
        {
            return ServiceResult<ReservationResponse>.Conflict(Messages.DroneIsDefective(drone.Name));
        }

        var studentGroup = await dbContext.StudentGroups.FindAsync([studentGroupId], cancellationToken);
        if (studentGroup is null)
        {
            return ServiceResult<ReservationResponse>.Invalid(Messages.UnknownStudentGroup(studentGroupId));
        }

        if (studentGroup.DeletedAt is not null)
        {
            return ServiceResult<ReservationResponse>.Conflict(Messages.StudentGroupInTrash(studentGroup.Name));
        }

        var alreadyReserved = ServiceResult<ReservationResponse>.Conflict(Messages.DroneAlreadyReserved(drone.Name, date));
        if (await dbContext.Reservations.AnyAsync(r => r.DroneId == droneId && r.Date == date, cancellationToken))
        {
            return alreadyReserved;
        }

        var reservation = new Reservation { DroneId = droneId, StudentGroupId = studentGroupId, Date = date };
        dbContext.Reservations.Add(reservation);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.IsUniqueConstraintViolation())
        {
            return alreadyReserved;
        }

        var isLoaned = await dbContext.Loans.AnyAsync(
            loan => loan.DroneId == droneId && loan.Status == LoanStatus.Active,
            cancellationToken);
        return ServiceResult<ReservationResponse>.Success(new ReservationResponse(
            reservation.Id, drone.Id, drone.Name, studentGroup.Id, studentGroup.Name, date, date == today, isLoaned));
    }

    /// <summary>Cancelling deletes the reservation; the drone is free on that day again (REQ-028).</summary>
    public async Task<ServiceResult<bool>> CancelAsync(int id, CancellationToken cancellationToken)
    {
        var deleted = await dbContext.Reservations.Where(reservation => reservation.Id == id).ExecuteDeleteAsync(cancellationToken);
        return deleted == 0
            ? ServiceResult<bool>.NotFound(Messages.UnknownReservation(id))
            : ServiceResult<bool>.Success(true);
    }

    private DateOnly Today() => DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime);
}
