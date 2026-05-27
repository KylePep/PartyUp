using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PartyUp.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddGameParentExternalId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ParentExternalId",
                table: "Games",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ParentExternalId",
                table: "Games");
        }
    }
}
