using PartyUp.Api.Models.Enums;

public class CharacterInteractionRequest
{
  public Guid FromCharacterId { get; set; }
  public Guid ToCharacterId { get; set; }
  public InteractionType Type { get; set; }
}