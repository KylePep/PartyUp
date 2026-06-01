using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PartyUp.Api.Migrations
{
    /// <inheritdoc />
    public partial class CharacterModelCleanup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MainRole",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Playstyle",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "PreferredModes",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Rank",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Region",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "SecondaryRole",
                table: "Characters");

            migrationBuilder.AddColumn<string>(
                name: "AdditionalNotes",
                table: "Characters",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdditionalNotes",
                table: "Characters");

            migrationBuilder.AddColumn<string>(
                name: "MainRole",
                table: "Characters",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Playstyle",
                table: "Characters",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<List<string>>(
                name: "PreferredModes",
                table: "Characters",
                type: "text[]",
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "Rank",
                table: "Characters",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Region",
                table: "Characters",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SecondaryRole",
                table: "Characters",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }
    }
}
