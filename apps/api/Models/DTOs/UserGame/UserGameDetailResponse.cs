namespace PartyUp.Api.Models.DTOs.UserGame;

public class UserGameDetailResponse
{
  public Guid Id { get; set; }
  public Guid UserId { get; set; }
  public Guid GameId { get; set; }
  public string GameName { get; set; } = string.Empty;
  public string? GameImageUrl { get; set; }
  public string? Description { get; set; }
  public string? Website { get; set; }
  public double Rating { get; set; }
  public List<string> Platforms { get; set; } = [];
}
