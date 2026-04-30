public class UserGame
{
  public int Id { get; set; }
  public string UserId { get; set; }
  public int SteamAppId { get; set; }
  public string GameName { get; set; }
  public int PlaytimeMinutes { get; set; }
  public bool IsActiveForMatchmaking { get; set; }
}