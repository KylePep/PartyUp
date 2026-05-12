namespace PartyUp.Api.Models.DTOs.UserGame;

public class UserGameResponse
{
  public Guid Id { get; set; }
  public Guid UserId { get; set; }
  public Guid GameId { get; set; }
  public string GameName { get; set; } = string.Empty;
  public string? GameImageUrl { get; set; }
}
