using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/steam")]
public class SteamController : ControllerBase
{
  private readonly SteamSyncService _syncService;

  public SteamController(SteamSyncService syncService)
  {
    _syncService = syncService;
  }

  [HttpPost("sync")]
  public async Task<IActionResult> Sync()
  {
    var userId = "hardcoded-for-now"; // supply these as parameters?
    var steamId = "76561198102675289";

    await _syncService.SyncUserGames(userId, steamId);

    return Ok();
  }
}
