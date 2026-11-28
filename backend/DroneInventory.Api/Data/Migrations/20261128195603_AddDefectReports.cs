using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DroneInventory.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDefectReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DefectReports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    DroneId = table.Column<int>(type: "INTEGER", nullable: false),
                    StudentGroupId = table.Column<int>(type: "INTEGER", nullable: true),
                    StudentGroupName = table.Column<string>(type: "TEXT", nullable: true),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    ReportedOn = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    RepairedOn = table.Column<DateOnly>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DefectReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DefectReports_Drones_DroneId",
                        column: x => x.DroneId,
                        principalTable: "Drones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DefectReports_StudentGroups_StudentGroupId",
                        column: x => x.StudentGroupId,
                        principalTable: "StudentGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DefectReports_DroneId",
                table: "DefectReports",
                column: "DroneId");

            migrationBuilder.CreateIndex(
                name: "IX_DefectReports_StudentGroupId",
                table: "DefectReports",
                column: "StudentGroupId");

            // Open defects from before the damage history become its first entries (REQ-042).
            migrationBuilder.Sql("""
                INSERT INTO "DefectReports" ("DroneId", "StudentGroupId", "StudentGroupName", "Description", "ReportedOn")
                SELECT d."Id",
                       (SELECT g."Id" FROM "StudentGroups" g WHERE g."Name" = d."DefectGroupName"),
                       d."DefectGroupName",
                       d."DefectNote",
                       date('now', 'localtime')
                FROM "Drones" d
                WHERE d."DefectNote" IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DefectReports");
        }
    }
}
