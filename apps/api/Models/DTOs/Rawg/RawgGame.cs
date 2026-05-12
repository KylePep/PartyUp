namespace PartyUp.Api.Models.DTOs.Rawg;

public class RawgGame
{
  public int Id { get; set; }
  public string Name { get; set; } = string.Empty;
  public string? Background_Image { get; set; }
}