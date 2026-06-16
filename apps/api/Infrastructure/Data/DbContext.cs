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
        public DbSet<UserProfile> UserProfiles { get; set; }
        public DbSet<Game> Games { get; set; }
        public DbSet<UserGame> UserGames { get; set; }
        public DbSet<Character> Characters { get; set; }
        public DbSet<CharacterInteraction> CharacterInteractions { get; set; }
        public DbSet<CharacterMatch> CharacterMatches { get; set; }
        public DbSet<MatchNotification> MatchNotifications { get; set; }
        public DbSet<GameFieldDefinition> GameFieldDefinitions { get; set; }
        public DbSet<CharacterFieldValue> CharacterFieldValues { get; set; }

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

            modelBuilder.Entity<UserGame>(e =>
            {
                e.Property(ug => ug.CreatedAt).HasDefaultValueSql("NOW()");
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

            modelBuilder.Entity<CharacterFieldValue>(e =>
            {
                e.HasKey(x => x.Id);
                e.HasOne(x => x.FieldDefinition)
                    .WithMany()
                    .HasForeignKey(x => x.FieldDefinitionId)
                    .OnDelete(DeleteBehavior.Cascade);
                e.HasOne<Character>()
                    .WithMany(c => c.FieldValues)
                    .HasForeignKey(x => x.CharacterId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            var preferencesComparer = new ValueComparer<UserPreferences>(
                (a, b) => JsonSerializer.Serialize(a, (JsonSerializerOptions?)null) == JsonSerializer.Serialize(b, (JsonSerializerOptions?)null),
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null).GetHashCode(),
                v => JsonSerializer.Deserialize<UserPreferences>(JsonSerializer.Serialize(v, (JsonSerializerOptions?)null), (JsonSerializerOptions?)null)!);

            modelBuilder.Entity<MatchNotification>(e =>
            {
                e.Property(n => n.Type).HasConversion<string>();
                e.HasOne(n => n.User)
                    .WithMany()
                    .HasForeignKey(n => n.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                e.HasOne(n => n.Match)
                    .WithMany()
                    .HasForeignKey(n => n.MatchId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Character>(e =>
            {
                e.Property(c => c.CreatedAt).HasDefaultValueSql("NOW()");
            });

            modelBuilder.Entity<CharacterInteraction>(e =>
            {
                e.HasIndex(i => i.FromCharacterId);
                e.HasIndex(i => i.ToCharacterId);
                e.HasIndex(i => new { i.ToCharacterId, i.Type });
            });

            modelBuilder.Entity<CharacterMatch>(e =>
            {
                e.HasIndex(m => m.CharacterAId);
                e.HasIndex(m => m.CharacterBId);
                e.HasIndex(m => new { m.CharacterAId, m.CharacterBId }).IsUnique();
            });

            modelBuilder.Entity<CharacterFieldValue>(e =>
            {
                e.HasIndex(fv => fv.CharacterId);
                e.HasIndex(fv => fv.FieldDefinitionId);
            });

            modelBuilder.Entity<UserProfile>(e =>
            {
                e.HasOne(p => p.User)
                    .WithOne()
                    .HasForeignKey<UserProfile>(p => p.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasIndex(p => p.UserId).IsUnique();

                e.Property(p => p.DisplayName).HasMaxLength(50);

                e.Property(p => p.Preferences)
                    .HasConversion(
                        v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                        v => JsonSerializer.Deserialize<UserPreferences>(v, (JsonSerializerOptions?)null) ?? new UserPreferences())
                    .HasColumnType("jsonb")
                    .Metadata.SetValueComparer(preferencesComparer);
            });
        }
    }
}
