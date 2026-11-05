using DroneInventory.Api.Common;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.StudentGroups;

public class StudentGroupService(DroneInventoryDbContext dbContext)
{
    public async Task<IReadOnlyList<StudentGroupResponse>> ListAsync(CancellationToken cancellationToken) =>
        await dbContext.StudentGroups
            .OrderBy(studentGroup => studentGroup.Name)
            .Select(studentGroup => new StudentGroupResponse(studentGroup.Id, studentGroup.Name))
            .ToListAsync(cancellationToken);

    public async Task<ServiceResult<StudentGroupResponse>> CreateAsync(
        CreateStudentGroupRequest request,
        CancellationToken cancellationToken)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            return ServiceResult<StudentGroupResponse>.Invalid("A student group needs a name.");
        }

        if (await dbContext.StudentGroups.AnyAsync(studentGroup => studentGroup.Name == name, cancellationToken))
        {
            return NameAlreadyExists(name);
        }

        var studentGroup = new StudentGroup { Name = name };
        dbContext.StudentGroups.Add(studentGroup);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.IsUniqueConstraintViolation())
        {
            return NameAlreadyExists(name);
        }

        return ServiceResult<StudentGroupResponse>.Success(new StudentGroupResponse(studentGroup.Id, studentGroup.Name));
    }

    private static ServiceResult<StudentGroupResponse> NameAlreadyExists(string name) =>
        ServiceResult<StudentGroupResponse>.Conflict($"A student group named \"{name}\" already exists.");
}
