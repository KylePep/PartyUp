using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PartyUp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddForeignKeyIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_CharacterMatches_CharacterAId_CharacterBId",
                table: "CharacterMatches",
                columns: new[] { "CharacterAId", "CharacterBId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CharacterInteractions_ToCharacterId_Type",
                table: "CharacterInteractions",
                columns: new[] { "ToCharacterId", "Type" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_CharacterMatches_CharacterAId_CharacterBId",
                table: "CharacterMatches");

            migrationBuilder.DropIndex(
                name: "IX_CharacterInteractions_ToCharacterId_Type",
                table: "CharacterInteractions");
        }
    }
}
