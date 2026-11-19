using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DroneInventory.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLoanNoteAndDueDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "DueDate",
                table: "Loans",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Note",
                table: "Loans",
                type: "TEXT",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DueDate",
                table: "Loans");

            migrationBuilder.DropColumn(
                name: "Note",
                table: "Loans");
        }
    }
}
