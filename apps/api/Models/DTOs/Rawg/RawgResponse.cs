namespace PartyUp.Api.Models.DTOs.Rawg;

public class RawgResponse
{
  public int Count { get; set; }
  public List<RawgGame> Results { get; set; } = new();
}
