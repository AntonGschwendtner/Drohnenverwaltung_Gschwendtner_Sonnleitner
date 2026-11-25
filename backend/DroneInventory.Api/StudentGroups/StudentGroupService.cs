using DroneInventory.Api.Common;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using System.Linq.Expressions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.StudentGroups;

public class StudentGroupService(DroneInventoryDbContext dbContext, TimeProvider timeProvider)
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
                .FirstOrDefault(),
            studentGroup.DeletedAt);

    public async Task<IReadOnlyList<StudentGroupResponse>> ListAsync(CancellationToken cancellationToken) =>
        await dbContext.StudentGroups
            .Where(studentGroup => studentGroup.DeletedAt == null)
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
        return ServiceResult<StudentGroupResponse>.Success(new StudentGroupResponse(studentGroup.Id, studentGroup.Name, [], null, null));
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

        if (studentGroup.DeletedAt is not null)
        {
            return ServiceResult<StudentGroupResponse>.Conflict(Messages.StudentGroupInTrash(studentGroup.Name));
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
    /// Moves a student group into the trash (REQ-033). It keeps its members and loans and can be restored. A group that
    /// has a drone right now stays, so the drone can still be returned through the loan page.
    /// </summary>
    public async Task<ServiceResult<bool>> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        // The transaction takes the write lock first, so the check and the move see the same loans.
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var studentGroup = await dbContext.StudentGroups.FindAsync([id], cancellationToken);
        if (studentGroup is null || studentGroup.DeletedAt is not null)
        {
            return ServiceResult<bool>.NotFound(Messages.UnknownStudentGroup(id));
        }

        var loanedDrone = await dbContext.Loans
            .Where(loan => loan.StudentGroupId == id && loan.Status == LoanStatus.Active)
            .Select(loan => loan.Drone!.Name)
            .FirstOrDefaultAsync(cancellationToken);
        if (loanedDrone is not null)
        {
            return ServiceResult<bool>.Conflict(Messages.StudentGroupHasActiveLoan(studentGroup.Name, loanedDrone));
        }

        // A group with an upcoming reservation stays until the reservation is cancelled (decision of 2026-11-12).
        var today = Today();
        var reservedOn = await dbContext.Reservations
            .Where(reservation => reservation.StudentGroupId == id && reservation.Date >= today)
            .OrderBy(reservation => reservation.Date)
            .Select(reservation => (DateOnly?)reservation.Date)
            .FirstOrDefaultAsync(cancellationToken);
        if (reservedOn is { } reservedDate)
        {
            return ServiceResult<bool>.Conflict(Messages.ReservedCannotDelete(studentGroup.Name, reservedDate));
        }

        studentGroup.DeletedAt = today;
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return ServiceResult<bool>.Success(true);
    }

    /// <summary>The groups in the trash, the most recently deleted first (REQ-033).</summary>
    public async Task<IReadOnlyList<TrashedStudentGroupResponse>> ListTrashAsync(CancellationToken cancellationToken) =>
        await dbContext.StudentGroups
            .Where(studentGroup => studentGroup.DeletedAt != null)
            .OrderByDescending(studentGroup => studentGroup.DeletedAt)
            .ThenBy(studentGroup => studentGroup.Name)
            .Select(studentGroup => new TrashedStudentGroupResponse(
                studentGroup.Id,
                studentGroup.Name,
                studentGroup.DeletedAt!.Value,
                dbContext.Loans.Count(loan => loan.StudentGroupId == studentGroup.Id),
                studentGroup.Members.Count))
            .ToListAsync(cancellationToken);

    /// <summary>Takes a group out of the trash with its members and loans (REQ-033).</summary>
    public async Task<ServiceResult<StudentGroupResponse>> RestoreAsync(int id, CancellationToken cancellationToken)
    {
        var studentGroup = await dbContext.StudentGroups.FindAsync([id], cancellationToken);
        if (studentGroup is null)
        {
            return ServiceResult<StudentGroupResponse>.NotFound(Messages.UnknownStudentGroup(id));
        }

        if (studentGroup.DeletedAt is null)
        {
            return ServiceResult<StudentGroupResponse>.NotFound(Messages.StudentGroupNotInTrash(studentGroup.Name));
        }

        studentGroup.DeletedAt = null;
        await dbContext.SaveChangesAsync(cancellationToken);

        return await GetAsync(id, cancellationToken);
    }

    /// <summary>
    /// Deletes a group from the trash for good, with its members (REQ-033). With "keep" its loans stay in the history
    /// under the group's name; with "delete" they are deleted too. Everything runs in one transaction, and a group that
    /// still has a drone stays.
    /// </summary>
    public async Task<ServiceResult<bool>> DeletePermanentlyAsync(int id, string? history, CancellationToken cancellationToken)
    {
        if (!HistoryChoice.IsValid(history))
        {
            return ServiceResult<bool>.Invalid(Messages.HistoryChoiceMissing);
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var studentGroup = await dbContext.StudentGroups.FindAsync([id], cancellationToken);
        if (studentGroup is null)
        {
            return ServiceResult<bool>.NotFound(Messages.UnknownStudentGroup(id));
        }

        if (studentGroup.DeletedAt is null)
        {
            return ServiceResult<bool>.Conflict(Messages.StudentGroupNotInTrash(studentGroup.Name));
        }

        var loanedDrone = await dbContext.Loans
            .Where(loan => loan.StudentGroupId == id && loan.Status == LoanStatus.Active)
            .Select(loan => loan.Drone!.Name)
            .FirstOrDefaultAsync(cancellationToken);
        if (loanedDrone is not null)
        {
            return ServiceResult<bool>.Conflict(Messages.StudentGroupHasActiveLoan(studentGroup.Name, loanedDrone));
        }

        var loansOfGroup = dbContext.Loans.Where(loan => loan.StudentGroupId == id);
        if (history == HistoryChoice.Keep)
        {
            var name = studentGroup.Name;
            await loansOfGroup.ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(loan => loan.FormerStudentGroupName, name)
                    .SetProperty(loan => loan.StudentGroupId, (int?)null),
                cancellationToken);
        }
        else
        {
            // The loan items go with their loans through the cascade of the database.
            await loansOfGroup.ExecuteDeleteAsync(cancellationToken);
        }

        // The members go with the group through the cascade of the database.
        dbContext.StudentGroups.Remove(studentGroup);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

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

        if (studentGroup.DeletedAt is not null)
        {
            return ServiceResult<StudentGroupMemberResponse>.Conflict(Messages.StudentGroupInTrash(studentGroup.Name));
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
        var studentGroup = await dbContext.StudentGroups.FindAsync([studentGroupId], cancellationToken);
        if (studentGroup is null)
        {
            return ServiceResult<bool>.NotFound(Messages.UnknownStudentGroup(studentGroupId));
        }

        if (studentGroup.DeletedAt is not null)
        {
            return ServiceResult<bool>.Conflict(Messages.StudentGroupInTrash(studentGroup.Name));
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

    /// <summary>
    /// Makes a member the group leader, or clears the leader with null (REQ-031). The old leader is cleared first and the
    /// new one set second, in one transaction, so the "one leader per group" index never sees two leaders. A member of
    /// another group counts as not found.
    /// </summary>
    public async Task<ServiceResult<StudentGroupResponse>> SetLeaderAsync(
        int studentGroupId,
        SetLeaderRequest request,
        CancellationToken cancellationToken)
    {
        var studentGroup = await dbContext.StudentGroups.FindAsync([studentGroupId], cancellationToken);
        if (studentGroup is null)
        {
            return ServiceResult<StudentGroupResponse>.NotFound(Messages.UnknownStudentGroup(studentGroupId));
        }

        if (studentGroup.DeletedAt is not null)
        {
            return ServiceResult<StudentGroupResponse>.Conflict(Messages.StudentGroupInTrash(studentGroup.Name));
        }

        var memberId = request.MemberId;
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            await dbContext.StudentGroupMembers
                .Where(member => member.StudentGroupId == studentGroupId && member.IsLeader && member.Id != memberId)
                .ExecuteUpdateAsync(setters => setters.SetProperty(member => member.IsLeader, false), cancellationToken);

            if (memberId is { } newLeaderId)
            {
                var changed = await dbContext.StudentGroupMembers
                    .Where(member => member.Id == newLeaderId && member.StudentGroupId == studentGroupId)
                    .ExecuteUpdateAsync(setters => setters.SetProperty(member => member.IsLeader, true), cancellationToken);

                if (changed == 0)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    return ServiceResult<StudentGroupResponse>.NotFound(Messages.UnknownMember(newLeaderId));
                }
            }

            await transaction.CommitAsync(cancellationToken);
        }
        catch (SqliteException exception) when (exception is { SqliteErrorCode: 19, SqliteExtendedErrorCode: 2067 })
        {
            // Another request chose a leader for this group at the same moment.
            return ServiceResult<StudentGroupResponse>.Conflict(Messages.LeaderChangedAtTheSameTime);
        }

        return await GetAsync(studentGroupId, cancellationToken);
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

        // The name of a group in the trash stays taken, so a restore never collides (REQ-033).
        var takenBy = await dbContext.StudentGroups
            .Where(studentGroup => studentGroup.Name == name && studentGroup.Id != exceptId)
            .Select(studentGroup => new { studentGroup.DeletedAt })
            .FirstOrDefaultAsync(cancellationToken);

        if (takenBy is null)
        {
            return (name, null);
        }

        return takenBy.DeletedAt is null
            ? (name, NameAlreadyExists(name))
            : (name, ServiceResult<StudentGroupResponse>.Conflict(Messages.StudentGroupNameInTrash(name)));
    }

    private DateOnly Today() => DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime);

    private static ServiceResult<StudentGroupResponse> NameAlreadyExists(string name) =>
        ServiceResult<StudentGroupResponse>.Conflict(Messages.StudentGroupNameExists(name));
}
