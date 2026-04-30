namespace PartyUp.Api.Models.DTOs.Character;

public class CreateCharacterRequest
{
  public string Name { get; set; } = default;
  public string? Nickname { get; set; }
  public string? Description { get; set; }
  public string? PlayStyle { get; set; }
}