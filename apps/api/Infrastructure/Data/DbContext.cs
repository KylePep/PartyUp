using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using PartyUp.Api.Models;

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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
      modelBuilder.Entity<Game>()
        .Property(g => g.Platforms)
        .HasConversion(
          v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
          v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>()
        )
        .HasColumnType("jsonb")
        .Metadata.SetValueComparer(new ValueComparer<List<string>>(
          (a, b) => a != null && b != null && a.SequenceEqual(b),
          v => v.Aggregate(0, (h, s) => HashCode.Combine(h, s.GetHashCode())),
          v => v.ToList()
        ));
    }
  }
}
