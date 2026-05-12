public class MatchResponse
{
  public Guid MatchId { get; set; }
  public Guid CharacterAId { get; set; }
  public Guid CharacterBId { get; set; }
  public DateTime MatchedAt { get; set; }
  public bool IsMatch { get; set; }
}