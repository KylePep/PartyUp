namespace PartyUp.Api.Models.DTOs.Character;

public class CreateCharacterRequest
{
  public Guid UserGameId { get; set; }

  public string Platform { get; set; } = default!;
  public string PlatformHandle { get; set; } = default!;
  public string Name { get; set; } = default!;
  public string? ImageUrl { get; set; }
  public string? Bio { get; set; }
  public string? MainRole { get; set; }
  public string? SecondaryRole { get; set; }
  public List<string> PreferredModes { get; set; } = [];
  public string? TimeZone { get; set; }
  public string[]? ActiveTimes { get; set; }
  public bool? UsesVoiceChat { get; set; }
  public string[]? Languages { get; set; }
  public string? Playstyle { get; set; }
  public string? Rank { get; set; }
  public string? Region { get; set; }
  public List<CharacterFieldValueRequest> GameFields { get; set; } = [];
}
