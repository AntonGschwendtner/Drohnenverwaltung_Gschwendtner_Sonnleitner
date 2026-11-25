using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DroneInventory.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentGroupTrash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "DeletedAt",
                table: "StudentGroups",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "StudentGroupId",
                table: "Loans",
                type: "INTEGER",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AddColumn<string>(
                name: "FormerStudentGroupName",
                table: "Loans",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "StudentGroups");

            migrationBuilder.DropColumn(
                name: "FormerStudentGroupName",
                table: "Loans");

            migrationBuilder.AlterColumn<int>(
                name: "StudentGroupId",
                table: "Loans",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "INTEGER",
                oldNullable: true);
        }
    }
}
