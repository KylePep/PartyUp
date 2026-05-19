using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using PartyUp.Api.Models;
using PartyUp.Api.Models.Enums;

namespace PartyUp.Api.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Game> Games { get; set; }
        public DbSet<UserGame> UserGames { get; set; }
        public DbSet<Character> Characters { get; set; }
        public DbSet<CharacterInteraction> CharacterInteractions { get; set; }
        public DbSet<CharacterMatch> CharacterMatches { get; set; }
        public DbSet<GameFieldDefinition> GameFieldDefinitions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            var stringListComparer = new ValueComparer<List<string>>(
                (a, b) => a != null && b != null && a.SequenceEqual(b),
                v => v.Aggregate(0, (h, s) => HashCode.Combine(h, s.GetHashCode())),
                v => v.ToList());

            modelBuilder.Entity<Game>(e =>
            {
                e.Property(g => g.Platforms)
                    .HasConversion(
                        v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                        v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                    .HasColumnType("jsonb")
                    .Metadata.SetValueComparer(stringListComparer);

                e.Property(g => g.SchemaStatus).HasConversion<string>();
            });

            modelBuilder.Entity<GameFieldDefinition>(e =>
            {
                e.HasKey(x => x.Id);
                e.Property(x => x.Type).HasConversion<string>();
                e.Property(x => x.Options)
                    .HasConversion(
                        v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                        v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                    .HasColumnType("jsonb")
                    .Metadata.SetValueComparer(stringListComparer);
                e.HasOne<Game>()
                    .WithMany(g => g.FieldDefinitions)
                    .HasForeignKey(x => x.GameId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
