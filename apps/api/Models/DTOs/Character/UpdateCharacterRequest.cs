namespace PartyUp.Api.Models.DTOs.Character;

public class UpdateCharacterRequest
{
  public string Name { get; set; } = string.Empty;
  public string? Nickname { get; set; }
  public string? Bio { get; set; }
  public string? Playstyle { get; set; }
  public string? Rank { get; set; }
  public string? Region { get; set; }
}
