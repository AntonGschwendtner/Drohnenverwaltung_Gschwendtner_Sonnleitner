using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Data;

public class DroneInventoryDbContext(DbContextOptions<DroneInventoryDbContext> options)
    : DbContext(options)
{
    public DbSet<Drone> Drones => Set<Drone>();

    public DbSet<StudentGroup> StudentGroups => Set<StudentGroup>();

    public DbSet<Loan> Loans => Set<Loan>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Drone>()
            .HasIndex(drone => drone.Name)
            .IsUnique();

        modelBuilder.Entity<StudentGroup>()
            .HasIndex(studentGroup => studentGroup.Name)
            .IsUnique();

        modelBuilder.Entity<Loan>(loan =>
        {
            loan.Property(l => l.Status).HasConversion<string>();

            // Returned loans must stay in the history, so a drone or student group
            // that is part of a loan cannot be deleted.
            loan.HasOne(l => l.Drone)
                .WithMany()
                .HasForeignKey(l => l.DroneId)
                .OnDelete(DeleteBehavior.Restrict);

            loan.HasOne(l => l.StudentGroup)
                .WithMany()
                .HasForeignKey(l => l.StudentGroupId)
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

        modelBuilder.Entity<LoanItem>(item =>
        {
            item.ToTable("LoanItems");
            item.Property(i => i.Type).HasConversion<string>();
        });
    }
}
