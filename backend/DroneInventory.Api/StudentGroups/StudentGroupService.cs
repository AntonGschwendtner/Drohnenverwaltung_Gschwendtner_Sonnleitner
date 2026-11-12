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

    /// <summary>One student group in the same shape as an item of the list (REQ-019).</summary>
    public async Task<ServiceResult<StudentGroupResponse>> GetAsync(int id, CancellationToken cancellationToken)
    {
        var studentGroup = await dbContext.StudentGroups
            .Where(studentGroup => studentGroup.Id == id)
            .Select(studentGroup => new StudentGroupResponse(studentGroup.Id, studentGroup.Name))
            .SingleOrDefaultAsync(cancellationToken);

        return studentGroup is null
            ? ServiceResult<StudentGroupResponse>.NotFound(Messages.UnknownStudentGroup(id))
            : ServiceResult<StudentGroupResponse>.Success(studentGroup);
    }

    public async Task<ServiceResult<StudentGroupResponse>> CreateAsync(
        CreateStudentGroupRequest request,
        CancellationToken cancellationToken)
    {
        var (name, error) = await CheckNameAsync(request.Name, exceptId: null, cancellationToken);
        if (error is not null)
        {
            return error;
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

    /// <summary>Changes the name with the same rules as creating (REQ-017).</summary>
    public async Task<ServiceResult<StudentGroupResponse>> UpdateAsync(
        int id,
        UpdateStudentGroupRequest request,
        CancellationToken cancellationToken)
    {
        var studentGroup = await dbContext.StudentGroups.FindAsync([id], cancellationToken);
        if (studentGroup is null)
        {
            return ServiceResult<StudentGroupResponse>.NotFound(Messages.UnknownStudentGroup(id));
        }

        var (name, error) = await CheckNameAsync(request.Name, exceptId: id, cancellationToken);
        if (error is not null)
        {
            return error;
        }

        studentGroup.Name = name;

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

    /// <summary>
    /// Deletes a student group that never had a loan (REQ-017). A group with any loan stays, so the history stays complete.
    /// </summary>
    public async Task<ServiceResult<bool>> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        var studentGroup = await dbContext.StudentGroups.FindAsync([id], cancellationToken);
        if (studentGroup is null)
        {
            return ServiceResult<bool>.NotFound(Messages.UnknownStudentGroup(id));
        }

        if (await dbContext.Loans.AnyAsync(loan => loan.StudentGroupId == id, cancellationToken))
        {
            return ServiceResult<bool>.Conflict(Messages.StudentGroupHasLoans(studentGroup.Name));
        }

        dbContext.StudentGroups.Remove(studentGroup);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.IsForeignKeyViolation())
        {
            // A loan was created after the check above; the database refuses the delete.
            return ServiceResult<bool>.Conflict(Messages.StudentGroupHasLoans(studentGroup.Name));
        }

        return ServiceResult<bool>.Success(true);
    }

    /// <summary>The name is required and unique. When editing, the group itself may keep its name.</summary>
    private async Task<(string Name, ServiceResult<StudentGroupResponse>? Error)> CheckNameAsync(
        string? requestedName,
        int? exceptId,
        CancellationToken cancellationToken)
    {
        var name = requestedName?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            return (string.Empty, ServiceResult<StudentGroupResponse>.Invalid(Messages.StudentGroupNeedsName));
        }

        var nameIsTaken = await dbContext.StudentGroups.AnyAsync(
            studentGroup => studentGroup.Name == name && studentGroup.Id != exceptId,
            cancellationToken);

        return nameIsTaken ? (name, NameAlreadyExists(name)) : (name, null);
    }

    private static ServiceResult<StudentGroupResponse> NameAlreadyExists(string name) =>
        ServiceResult<StudentGroupResponse>.Conflict(Messages.StudentGroupNameExists(name));
}
