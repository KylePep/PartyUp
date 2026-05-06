public class CharacterInteractionRequest
{
  public Guid FromCharacterId { get; set; }
  public Guid ToCharacterId { get; set; }
  public bool IsLike { get; set; }
}