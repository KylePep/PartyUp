using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PartyUp.Api.Migrations
{
    /// <inheritdoc />
    public partial class RenameCharacterFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "PlayStyle",
                table: "Characters",
                newName: "Playstyle");

            migrationBuilder.RenameColumn(
                name: "Description",
                table: "Characters",
                newName: "Bio");

            migrationBuilder.RenameColumn(
                name: "CreateAt",
                table: "Characters",
                newName: "CreatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Playstyle",
                table: "Characters",
                newName: "PlayStyle");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "Characters",
                newName: "CreateAt");

            migrationBuilder.RenameColumn(
                name: "Bio",
                table: "Characters",
                newName: "Description");
        }
    }
}
