using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DroneInventory.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDefectAndReturnedQuantity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ReturnedQuantity",
                table: "LoanItems",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DefectNote",
                table: "Drones",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            // Loans returned before the return check: everything came back.
            migrationBuilder.Sql(
                "UPDATE LoanItems SET ReturnedQuantity = Quantity WHERE LoanId IN (SELECT Id FROM Loans WHERE Status = 'Returned');");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReturnedQuantity",
                table: "LoanItems");

            migrationBuilder.DropColumn(
                name: "DefectNote",
                table: "Drones");
        }
    }
}
