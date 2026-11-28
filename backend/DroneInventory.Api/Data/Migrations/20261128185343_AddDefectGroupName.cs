using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DroneInventory.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDefectGroupName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DefectGroupName",
                table: "Drones",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefectGroupName",
                table: "Drones");
        }
    }
}
