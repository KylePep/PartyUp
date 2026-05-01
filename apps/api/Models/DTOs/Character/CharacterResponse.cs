namespace PartyUp.Api.Models.DTOs.Character;

public class CharacterResponse
{
  public Guid Id { get; set; }
  public Guid UserGameId { get; set; }

  public string Name { get; set; } = default!;
  public string? Nickname { get; set; }
  public string? Description { get; set; }
  public string? PlayStyle { get; set; }

  public DateTime CreatedAt { get; set; }
}
