namespace PartyUp.Api.Models.DTOs.Character;

public class CharacterResponse
{
  public Guid Id { get; set; }
  public Guid UserGameId { get; set; }

  public string Name { get; set; } = default!;
  public string? Nickname { get; set; }
  public string? Bio { get; set; }
  public string? Playstyle { get; set; }
  public string? Rank { get; set; }
  public string? Region { get; set; }

  public DateTime CreatedAt { get; set; }
}
