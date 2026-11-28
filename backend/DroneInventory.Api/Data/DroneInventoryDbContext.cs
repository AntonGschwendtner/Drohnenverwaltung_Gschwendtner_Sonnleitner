using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Data;

public class DroneInventoryDbContext(DbContextOptions<DroneInventoryDbContext> options)
    : DbContext(options)
{
    public DbSet<Drone> Drones => Set<Drone>();

    public DbSet<StudentGroup> StudentGroups => Set<StudentGroup>();

    public DbSet<StudentGroupMember> StudentGroupMembers => Set<StudentGroupMember>();

    public DbSet<Loan> Loans => Set<Loan>();

    public DbSet<Reservation> Reservations => Set<Reservation>();

    public DbSet<DefectReport> DefectReports => Set<DefectReport>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Drone>()
            .HasIndex(drone => drone.Name)
            .IsUnique();

        modelBuilder.Entity<Drone>()
            .Property(drone => drone.DefectNote)
            .HasMaxLength(500);

        modelBuilder.Entity<StudentGroup>()
            .HasIndex(studentGroup => studentGroup.Name)
            .IsUnique();

        modelBuilder.Entity<StudentGroupMember>(member =>
        {
            member.ToTable("StudentGroupMembers");

            // NOCASE makes the unique index and the sorting ignore upper and lower case (REQ-031).
            member.Property(m => m.Name)
                .HasMaxLength(StudentGroupMember.MaxNameLength)
                .UseCollation("NOCASE");

            member.HasIndex(m => new { m.StudentGroupId, m.Name })
                .IsUnique();

            // At most one leader per group, even when two requests arrive at the same time.
            member.HasIndex(m => m.StudentGroupId)
                .IsUnique()
                .HasFilter($"\"{nameof(StudentGroupMember.IsLeader)}\" = 1")
                .HasDatabaseName("IX_StudentGroupMembers_Leader");
        });

        // Members belong to their group and go with it when the group is deleted for good from the trash (REQ-033).
        modelBuilder.Entity<StudentGroup>()
            .HasMany(studentGroup => studentGroup.Members)
            .WithOne()
            .HasForeignKey(member => member.StudentGroupId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Loan>(loan =>
        {
            loan.Property(l => l.Status).HasConversion<string>();
            loan.Property(l => l.Note).HasMaxLength(500);

            // Returned loans must stay in the history, so a drone or student group
            // that is part of a loan cannot be deleted.
            // Optional only for loans whose drone was deleted for good with "keep the history" (REQ-034).
            loan.HasOne(l => l.Drone)
                .WithMany()
                .HasForeignKey(l => l.DroneId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            // Optional only for loans whose group was deleted for good with "keep the history" (REQ-033).
            loan.HasOne(l => l.StudentGroup)
                .WithMany()
                .HasForeignKey(l => l.StudentGroupId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            loan.HasMany(l => l.Items)
                .WithOne()
                .HasForeignKey(item => item.LoanId)
                .OnDelete(DeleteBehavior.Cascade);

            // Guards the rule "at most one active loan" even when two requests arrive at the same time.
            loan.HasIndex(l => l.DroneId)
                .IsUnique()
                .HasFilter($"\"{nameof(Loan.Status)}\" = '{nameof(LoanStatus.Active)}'");
        });

        modelBuilder.Entity<Reservation>(reservation =>
        {
            // At most one reservation per drone and day, also for two requests at the same time (REQ-027).
            reservation.HasIndex(r => new { r.DroneId, r.Date }).IsUnique();

            // The trash refuses drones and groups with upcoming reservations, so only past reservations can be left
            // when one is deleted for good or by the general reset; they go with it.
            reservation.HasOne(r => r.Drone).WithMany().HasForeignKey(r => r.DroneId).OnDelete(DeleteBehavior.Cascade);
            reservation.HasOne(r => r.StudentGroup).WithMany().HasForeignKey(r => r.StudentGroupId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DefectReport>(report =>
        {
            report.Property(r => r.Description).HasMaxLength(500);
            // The damage history belongs to the drone and goes with it when it is deleted for good (REQ-042).
            report.HasOne(r => r.Drone).WithMany().HasForeignKey(r => r.DroneId).OnDelete(DeleteBehavior.Cascade);
            // A group deleted for good leaves its reports; the name stays (REQ-042).
            report.HasOne<StudentGroup>().WithMany().HasForeignKey(r => r.StudentGroupId).IsRequired(false).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<LoanItem>(item =>
        {
            item.ToTable("LoanItems");
            item.Property(i => i.Type).HasConversion<string>();
        });
    }
}
