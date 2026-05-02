using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PartyUp.Api.Migrations
{
    /// <inheritdoc />
    public partial class CharacterInteractions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CharacterInteractions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FromCharacterId = table.Column<Guid>(type: "uuid", nullable: false),
                    ToCharacterId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CharacterInteractions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CharacterInteractions_Characters_FromCharacterId",
                        column: x => x.FromCharacterId,
                        principalTable: "Characters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CharacterInteractions_Characters_ToCharacterId",
                        column: x => x.ToCharacterId,
                        principalTable: "Characters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CharacterMatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CharacterAId = table.Column<Guid>(type: "uuid", nullable: false),
                    CharacterBId = table.Column<Guid>(type: "uuid", nullable: false),
                    MatchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CharacterMatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CharacterMatches_Characters_CharacterAId",
                        column: x => x.CharacterAId,
                        principalTable: "Characters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CharacterMatches_Characters_CharacterBId",
                        column: x => x.CharacterBId,
                        principalTable: "Characters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CharacterInteractions_FromCharacterId",
                table: "CharacterInteractions",
                column: "FromCharacterId");

            migrationBuilder.CreateIndex(
                name: "IX_CharacterInteractions_ToCharacterId",
                table: "CharacterInteractions",
                column: "ToCharacterId");

            migrationBuilder.CreateIndex(
                name: "IX_CharacterMatches_CharacterAId",
                table: "CharacterMatches",
                column: "CharacterAId");

            migrationBuilder.CreateIndex(
                name: "IX_CharacterMatches_CharacterBId",
                table: "CharacterMatches",
                column: "CharacterBId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CharacterInteractions");

            migrationBuilder.DropTable(
                name: "CharacterMatches");
        }
    }
}
