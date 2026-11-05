using DroneInventory.Api.Common;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Loans;

public class LoanService(DroneInventoryDbContext dbContext, TimeProvider timeProvider)
{
    public async Task<ServiceResult<LoanResponse>> CreateAsync(CreateLoanRequest request, CancellationToken cancellationToken)
    {
        if (request.DroneId is not { } droneId)
        {
            return ServiceResult<LoanResponse>.Invalid("A loan needs a drone.");
        }

        if (request.StudentGroupId is not { } studentGroupId)
        {
            return ServiceResult<LoanResponse>.Invalid("A loan needs a student group.");
        }

        var drone = await dbContext.Drones.FindAsync([droneId], cancellationToken);
        if (drone is null)
        {
            return ServiceResult<LoanResponse>.Invalid($"The drone with the id {droneId} does not exist.");
        }

        var studentGroup = await dbContext.StudentGroups.FindAsync([studentGroupId], cancellationToken);
        if (studentGroup is null)
        {
            return ServiceResult<LoanResponse>.Invalid($"The student group with the id {studentGroupId} does not exist.");
        }

        var isLoaned = await dbContext.Loans.AnyAsync(
            loan => loan.DroneId == drone.Id && loan.Status == LoanStatus.Active,
            cancellationToken);
        if (isLoaned)
        {
            return AlreadyLoaned(drone);
        }

        var loan = new Loan
        {
            DroneId = drone.Id,
            StudentGroupId = studentGroup.Id,
            LoanDate = DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime),
            Status = LoanStatus.Active,
        };
        dbContext.Loans.Add(loan);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.IsUniqueConstraintViolation())
        {
            // Another request loaned the drone after the check above.
            return AlreadyLoaned(drone);
        }

        return ServiceResult<LoanResponse>.Success(new LoanResponse(
            loan.Id,
            drone.Id,
            drone.Name,
            studentGroup.Id,
            studentGroup.Name,
            loan.LoanDate,
            loan.ReturnDate,
            loan.Status));
    }

    private static ServiceResult<LoanResponse> AlreadyLoaned(Drone drone) =>
        ServiceResult<LoanResponse>.Conflict($"The drone \"{drone.Name}\" is already loaned.");
}
