using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.UserGame;
using PartyUp.Api.Services.Interfaces;

[ApiController]
[Route("api/user-games")]
[Authorize]
public class UserGamesController : ControllerBase
{
  private readonly IUserGameService _service;
  private readonly IMatchNotificationService _matchNotifications;

  public UserGamesController(IUserGameService service, IMatchNotificationService matchNotifications)
  {
    _service = service;
    _matchNotifications = matchNotifications;
  }

  [HttpPost]
  public async Task<IActionResult> AddGame([FromBody] AddUserGameRequest request)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    try
    {
      var result = await _service.AddGameToUser(userId, request);
      return Ok(new
      {
        userGame = ToResponse(result.UserGame, 0),
        redirected = result.Redirected,
        message = result.Message
      });
    }
    catch (InvalidOperationException ex)
    {
      return Conflict(new { message = ex.Message });
    }
  }

  [HttpGet]
  public async Task<IActionResult> GetUserGames()
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var games = await _service.GetUserGames(userId);
    var ids = games.Select(g => g.Id).ToList();
    var counts = await _matchNotifications.GetNewMatchCountsByUserGameAsync(userId, ids);
    return Ok(games.Select(g => ToResponse(g, counts.GetValueOrDefault(g.Id, 0))));
  }

  [HttpGet("{gameId}/game")]
  public async Task<IActionResult> GetUserGameByGameId(Guid gameId)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var userGame = await _service.GetUserGameByGameId(userId, gameId);
    if (userGame == null)
      return NotFound();
    return Ok(ToDetailResponse(userGame));
  }

  [HttpDelete("{id}")]
  public async Task<IActionResult> DeleteUserGame(Guid id)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var deleted = await _service.DeleteUserGame(id, userId);
    if (!deleted)
      return NotFound();
    return NoContent();
  }

  private static UserGameResponse ToResponse(UserGame ug, int newMatchCount = 0) => new()
  {
    Id = ug.Id,
    UserId = ug.UserId,
    GameId = ug.GameId,
    GameName = ug.Game.Name,
    GameImageUrl = ug.Game.ImageUrl,
    CreatedAt = ug.CreatedAt,
    NewMatchCount = newMatchCount
  };

  private static UserGameDetailResponse ToDetailResponse(UserGame ug) => new()
  {
    Id = ug.Id,
    UserId = ug.UserId,
    GameId = ug.GameId,
    GameName = ug.Game.Name,
    GameImageUrl = ug.Game.ImageUrl,
    Description = ug.Game.Description,
    Website = ug.Game.Website,
    Rating = ug.Game.Rating,
    Platforms = ug.Game.Platforms
  };
}
