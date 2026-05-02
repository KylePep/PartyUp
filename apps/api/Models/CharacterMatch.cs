namespace PartyUp.Api.Models;

public class CharacterMatch
{
  public Guid Id { get; set; }

  public Guid CharacterAId { get; set; }
  public Character CharacterA { get; set; }

  public Guid CharacterBId { get; set; }
  public Character CharacterB { get; set; }

  public DateTime MatchedAt { get; set; }
}