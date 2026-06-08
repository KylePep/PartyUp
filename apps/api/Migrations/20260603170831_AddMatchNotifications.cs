using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PartyUp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMatchNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MatchNotifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    MatchId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    ViewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MatchNotifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MatchNotifications_CharacterMatches_MatchId",
                        column: x => x.MatchId,
                        principalTable: "CharacterMatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MatchNotifications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MatchNotifications_MatchId",
                table: "MatchNotifications",
                column: "MatchId");

            migrationBuilder.CreateIndex(
                name: "IX_MatchNotifications_UserId",
                table: "MatchNotifications",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MatchNotifications");
        }
    }
}
