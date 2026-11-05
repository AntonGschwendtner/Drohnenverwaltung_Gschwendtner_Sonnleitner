using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Data;

public class DroneInventoryDbContext(DbContextOptions<DroneInventoryDbContext> options)
    : DbContext(options)
{
    public DbSet<Drone> Drones => Set<Drone>();

    public DbSet<StudentGroup> StudentGroups => Set<StudentGroup>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Drone>()
            .HasIndex(drone => drone.Name)
            .IsUnique();

        modelBuilder.Entity<StudentGroup>()
            .HasIndex(studentGroup => studentGroup.Name)
            .IsUnique();
    }
}
