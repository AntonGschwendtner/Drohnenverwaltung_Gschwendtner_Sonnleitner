using System.Net;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>Storage of the members of a student group and its leader (REQ-031).</summary>
public sealed class StudentGroupMemberEntityTests : IDisposable
{
    private const int SqliteConstraintError = 19;

    private readonly DroneInventoryApiFactory _factory = new();

    [Fact]
    public async Task Member_is_stored_with_group_and_leader_flag()
    {
        var groupId = await SaveGroupAsync("Group 3");
        await SaveMemberAsync(groupId, "Anna Huber", isLeader: true);

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        var group = await dbContext.StudentGroups.Include(g => g.Members).SingleAsync();

        var member = Assert.Single(group.Members);
        Assert.Equal("Anna Huber", member.Name);
        Assert.True(member.IsLeader);
    }

    [Fact]
    public async Task Database_refuses_the_same_name_in_a_group_ignoring_case()
    {
        var groupId = await SaveGroupAsync("Group 3");
        await SaveMemberAsync(groupId, "Anna Huber");

        var exception = await Assert.ThrowsAsync<DbUpdateException>(() => SaveMemberAsync(groupId, "anna huber"));

        var sqliteException = Assert.IsType<SqliteException>(exception.InnerException);
        Assert.Equal(SqliteConstraintError, sqliteException.SqliteErrorCode);
        Assert.Contains("StudentGroupMembers.StudentGroupId, StudentGroupMembers.Name", sqliteException.Message);
    }

    [Fact]
    public async Task Database_accepts_the_same_name_in_another_group()
    {
        var group3 = await SaveGroupAsync("Group 3");
        var group4 = await SaveGroupAsync("Group 4");

        await SaveMemberAsync(group3, "Anna Huber");
        await SaveMemberAsync(group4, "Anna Huber");

        Assert.Equal(2, await CountMembersAsync());
    }

    [Fact]
    public async Task Database_refuses_a_second_leader_in_a_group()
    {
        var groupId = await SaveGroupAsync("Group 3");
        await SaveMemberAsync(groupId, "Anna Huber", isLeader: true);
        await SaveMemberAsync(groupId, "Ben Wagner");

        var exception = await Assert.ThrowsAsync<DbUpdateException>(
            () => SaveMemberAsync(groupId, "Clara Berger", isLeader: true));

        var sqliteException = Assert.IsType<SqliteException>(exception.InnerException);
        Assert.Equal(SqliteConstraintError, sqliteException.SqliteErrorCode);
    }

    [Fact]
    public async Task Database_accepts_one_leader_in_each_group()
    {
        var group3 = await SaveGroupAsync("Group 3");
        var group4 = await SaveGroupAsync("Group 4");

        await SaveMemberAsync(group3, "Anna Huber", isLeader: true);
        await SaveMemberAsync(group4, "Ben Wagner", isLeader: true);

        Assert.Equal(2, await CountMembersAsync());
    }

    [Fact]
    public async Task Delete_a_group_with_members_keeps_them_in_the_trash()
    {
        var groupId = await SaveGroupAsync("Group 4");
        await SaveMemberAsync(groupId, "Anna Huber", isLeader: true);
        using var client = _factory.CreateClient();

        var response = await client.DeleteAsync($"/api/student-groups/{groupId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal("[]", await client.GetStringAsync("/api/student-groups"));
        Assert.Equal(1, await CountMembersAsync());
    }

    public void Dispose() => _factory.Dispose();

    private async Task<int> SaveGroupAsync(string name)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        var group = new StudentGroup { Name = name };
        dbContext.StudentGroups.Add(group);
        await dbContext.SaveChangesAsync();
        return group.Id;
    }

    private async Task SaveMemberAsync(int groupId, string name, bool isLeader = false)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        dbContext.StudentGroupMembers.Add(new StudentGroupMember { StudentGroupId = groupId, Name = name, IsLeader = isLeader });
        await dbContext.SaveChangesAsync();
    }

    private async Task<int> CountMembersAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DroneInventoryDbContext>();
        return await dbContext.StudentGroupMembers.CountAsync();
    }
}
