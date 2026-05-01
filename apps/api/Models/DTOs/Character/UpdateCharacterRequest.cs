namespace PartyUp.Api.Models.DTOs.Character;

public class UpdateCharacterRequest
{
  public string Name { get; set; } = string.Empty;

  public string? Nickname { get; set; }

  public string? Description { get; set; }

  public string? PlayStyle { get; set; }
}
