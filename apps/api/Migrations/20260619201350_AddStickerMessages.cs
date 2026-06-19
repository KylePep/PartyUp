using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PartyUp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddStickerMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StickerMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MatchId = table.Column<Guid>(type: "uuid", nullable: false),
                    SenderCharacterId = table.Column<Guid>(type: "uuid", nullable: false),
                    Emoji = table.Column<string>(type: "text", nullable: false),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StickerMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StickerMessages_CharacterMatches_MatchId",
                        column: x => x.MatchId,
                        principalTable: "CharacterMatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StickerMessages_Characters_SenderCharacterId",
                        column: x => x.SenderCharacterId,
                        principalTable: "Characters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StickerMessages_MatchId",
                table: "StickerMessages",
                column: "MatchId");

            migrationBuilder.CreateIndex(
                name: "IX_StickerMessages_SenderCharacterId",
                table: "StickerMessages",
                column: "SenderCharacterId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StickerMessages");
        }
    }
}
