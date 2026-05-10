namespace PartyUp.Api.Models.DTOs.Character;

public class DiscoverCharacterResponse
{
  public Guid Id { get; set; }
  public string Name { get; set; } = default!;
  public string Platform { get; set; }
  public string? ImageUrl { get; set; }
  public string? Bio { get; set; }
  public string? MainRole { get; set; }
  public string? SecondaryRole { get; set; }
  public List<string> PreferredModes { get; set; } = [];
  public bool? UsesVoiceChat { get; set; }
  public string[]? Languages { get; set; }
  public string? Playstyle { get; set; }
  public string? Rank { get; set; }
  public string? Region { get; set; }
  public string? GameName { get; set; }
  public string? GameImageUrl { get; set; }
}
