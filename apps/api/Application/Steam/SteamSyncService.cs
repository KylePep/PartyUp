using PartyUp.Api.Infrastructure.Data;

public class SteamSyncService
{
  private readonly SteamClient _steamClient;
  private readonly AppDbContext _db;

  public SteamSyncService(SteamClient steamClient, AppDbContext db)
  {
    _steamClient = steamClient;
    _db = db;
  }

  public async Task SyncUserGames(string userId, string steamId)
  {
    var response = await _steamClient.GetOwnedGames(steamId);


    var games = response?.response?.games;
    if (games == null) return;

    var existing = _db.UserGames.Where(x => x.UserId == userId);
    _db.UserGames.RemoveRange(existing);

    var mapped = games.Select(g => new UserGame
    {
      UserId = userId,
      SteamAppId = g.appid,
      GameName = g.name,
      PlaytimeMinutes = g.playtime_forever,
      IsActiveForMatchmaking = g.playtime_forever > 30
    });

    await _db.UserGames.AddRangeAsync(mapped);
    await _db.SaveChangesAsync();
  }
}
