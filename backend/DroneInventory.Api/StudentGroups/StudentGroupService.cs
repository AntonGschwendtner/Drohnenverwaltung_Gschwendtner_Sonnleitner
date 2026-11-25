using DroneInventory.Api.Common;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.StudentGroups;

public class StudentGroupService(DroneInventoryDbContext dbContext)
{
    /// <summary>
    /// The shape of a group in every answer: members alphabetical (NOCASE column), the leader's name or null (REQ-031).
    /// </summary>
    private static readonly Expression<Func<StudentGroup, StudentGroupResponse>> ToResponse = studentGroup =>
        new StudentGroupResponse(
            studentGroup.Id,
            studentGroup.Name,
            studentGroup.Members
                .OrderBy(member => member.Name)
                .ThenBy(member => member.Id)
                .Select(member => new StudentGroupMemberResponse(member.Id, member.Name, member.IsLeader))
                .ToList(),
            studentGroup.Members
                .Where(member => member.IsLeader)
                .Select(member => member.Name)
                .FirstOrDefault());

    public async Task<IReadOnlyList<StudentGroupResponse>> ListAsync(CancellationToken cancellationToken) =>
        await dbContext.StudentGroups
            .OrderBy(studentGroup => studentGroup.Name)
            .Select(ToResponse)
            .ToListAsync(cancellationToken);

    /// <summary>One student group in the same shape as an item of the list (REQ-019).</summary>
    public async Task<ServiceResult<StudentGroupResponse>> GetAsync(int id, CancellationToken cancellationToken)
    {
        var studentGroup = await dbContext.StudentGroups
            .Where(studentGroup => studentGroup.Id == id)
            .Select(ToResponse)
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

        // A new group has no members and no leader yet.
        return ServiceResult<StudentGroupResponse>.Success(new StudentGroupResponse(studentGroup.Id, studentGroup.Name, [], null));
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

        // Read back, so the answer carries the members as well.
        return await GetAsync(id, cancellationToken);
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

    /// <summary>
    /// Adds a person to a group (REQ-031). The name is required, at most 100 characters and unique within the group,
    /// ignoring upper and lower case; the database compares with NOCASE and catches parallel requests.
    /// </summary>
    public async Task<ServiceResult<StudentGroupMemberResponse>> AddMemberAsync(
        int studentGroupId,
        AddMemberRequest request,
        CancellationToken cancellationToken)
    {
        var studentGroup = await dbContext.StudentGroups.FindAsync([studentGroupId], cancellationToken);
        if (studentGroup is null)
        {
            return ServiceResult<StudentGroupMemberResponse>.NotFound(Messages.UnknownStudentGroup(studentGroupId));
        }

        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            return ServiceResult<StudentGroupMemberResponse>.Invalid(Messages.MemberNeedsName);
        }

        if (name.Length > StudentGroupMember.MaxNameLength)
        {
            return ServiceResult<StudentGroupMemberResponse>.Invalid(Messages.MemberNameTooLong(StudentGroupMember.MaxNameLength));
        }

        var memberExists = ServiceResult<StudentGroupMemberResponse>.Conflict(Messages.MemberExists(name, studentGroup.Name));
        if (await dbContext.StudentGroupMembers.AnyAsync(
                member => member.StudentGroupId == studentGroupId && member.Name == name,
                cancellationToken))
        {
            return memberExists;
        }

        var member = new StudentGroupMember { StudentGroupId = studentGroupId, Name = name };
        dbContext.StudentGroupMembers.Add(member);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.IsUniqueConstraintViolation())
        {
            return memberExists;
        }

        return ServiceResult<StudentGroupMemberResponse>.Success(
            new StudentGroupMemberResponse(member.Id, member.Name, member.IsLeader));
    }

    /// <summary>
    /// Removes a person from a group (REQ-031). Loans of the group stay as they are; a removed leader leaves the group
    /// without a leader. A member of another group counts as not found.
    /// </summary>
    public async Task<ServiceResult<bool>> RemoveMemberAsync(int studentGroupId, int memberId, CancellationToken cancellationToken)
    {
        if (!await dbContext.StudentGroups.AnyAsync(studentGroup => studentGroup.Id == studentGroupId, cancellationToken))
        {
            return ServiceResult<bool>.NotFound(Messages.UnknownStudentGroup(studentGroupId));
        }

        var member = await dbContext.StudentGroupMembers.SingleOrDefaultAsync(
            m => m.Id == memberId && m.StudentGroupId == studentGroupId,
            cancellationToken);
        if (member is null)
        {
            return ServiceResult<bool>.NotFound(Messages.UnknownMember(memberId));
        }

        dbContext.StudentGroupMembers.Remove(member);
        await dbContext.SaveChangesAsync(cancellationToken);

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
