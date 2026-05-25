namespace PartyUp.Api.Models;

using System.ComponentModel.DataAnnotations;
using PartyUp.Api.Models;

public class Character
{
  public Guid Id { get; set; }

  public Guid UserGameId { get; set; }
  public UserGame UserGame { get; set; } = default!;

  [Required]
  [MaxLength(50)]
  public string Platform { get; set; } = default!;

  [Required]
  [MaxLength(100)]
  public string PlatformHandle { get; set; } = default!;

  [Required]
  [MaxLength(50)]
  public string Name { get; set; } = default!;

  [MaxLength(500)]
  public string? ImageUrl { get; set; }

  [MaxLength(1000)]
  public string? Bio { get; set; }

  [MaxLength(50)]
  public string? MainRole { get; set; }

  [MaxLength(50)]
  public string? SecondaryRole { get; set; }

  public List<string> PreferredModes { get; set; } = [];

  public string? TimeZone { get; set; }
  public string[]? ActiveTimes { get; set; }

  public bool? UsesVoiceChat { get; set; }

  public string[]? Languages { get; set; }

  [MaxLength(100)]
  public string? Playstyle { get; set; }

  [MaxLength(50)]
  public string? Rank { get; set; }

  [MaxLength(50)]
  public string? Region { get; set; }

  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
  public List<CharacterFieldValue> FieldValues { get; set; } = [];
}