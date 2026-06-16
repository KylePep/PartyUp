using PartyUp.Api.Models.Enums;

namespace PartyUp.Api.Models;

public class CharacterInteraction
{
  public Guid Id { get; set; }

  public Guid FromCharacterId { get; set; }
  public Character FromCharacter { get; set; }

  public Guid ToCharacterId { get; set; }
  public Character ToCharacter { get; set; }

  public InteractionType Type { get; set; }

  public DateTime CreatedAt { get; set; }
}