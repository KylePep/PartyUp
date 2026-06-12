using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Game;
using PartyUp.Api.Infrastructure.Clients;
using PartyUp.Api.Infrastructure.Data;

namespace PartyUp.Api.Services;

public class GameService : IGameService
{
  private readonly RawgClient _rawg;
  private readonly AppDbContext _db;
  private const int PageSize = 20;

  public GameService(RawgClient rawg, AppDbContext db)
  {
    _rawg = rawg;
    _db = db;
  }

  public async Task<PagedGamesResult> SearchGames(string q, int page, List<int>? genres, bool? exclude_additions, List<string>? tags)
  {
    var response = await _rawg.GetGames(q, page, genres, exclude_additions, tags);

    var games = response.Results.Select(g => new GameSimple
    {
      ExternalId = g.Id,
      Name = g.Name,
      ImageUrl = g.Background_Image
    }).ToList();

    if (games.Count > 0)
    {
      var externalIds = games.Select(g => g.ExternalId).ToList();

      var counts = await _db.UserGames
          .Include(ug => ug.Game)
          .Where(ug => externalIds.Contains(ug.Game.ExternalId))
          .GroupBy(ug => ug.Game.ExternalId)
          .Select(g => new { ExternalId = g.Key, Count = g.Count() })
          .ToDictionaryAsync(x => x.ExternalId, x => x.Count);

      foreach (var game in games)
      {
        if (counts.TryGetValue(game.ExternalId, out var count))
          game.PlayerCount = count;
      }
    }

    return new PagedGamesResult
    {
      Games = games,
      TotalCount = response.Count,
      Page = page,
      TotalPages = response.Count == 0 ? 1 : (int)Math.Ceiling(response.Count / (double)PageSize)
    };
  }

  public async Task<Game?> GetGameById(int id)
  {
    var dbGame = await _db.Games
      .FirstOrDefaultAsync(g => g.ExternalId == id);
    if (dbGame != null)
      return dbGame;

    var rawgGame = await _rawg.GetGameById(id);
    if (rawgGame == null)
      return null;

    return new Game
    {
      ExternalId = rawgGame.Id,
      Name = rawgGame.Name,
      Description = rawgGame.Description,
      ImageUrl = rawgGame.Background_Image,
      Website = rawgGame.Website,
      Rating = rawgGame.Rating,
      Platforms = rawgGame.Platforms.Select(p => p.Platform.Name).ToList()
    };
  }

  public async Task<Game?> GetGameByDbId(Guid id)
  {
    var game = await _db.Games.FindAsync(id);
    return game;
  }

  public async Task<Game?> getGameByExternalId(int externalId)
  {
    var game = await _db.Games
      .FirstOrDefaultAsync(g => g.ExternalId == externalId);
    return game;
  }

  public async Task<Game?> GetAndPersistGameDetails(int externalId)
  {
    var rawgGame = await _rawg.GetGameById(externalId);
    if (rawgGame == null)
      return null;

    // RAWG never populates parent_game inline — parents_count > 0 means we
    // need a second call to /api/games/{id}/parent-games to get the actual parent.
    int? parentExternalId = null;
    if (rawgGame.Parents_Count > 0)
    {
      var parentsResponse = await _rawg.GetParentGames(externalId);
      parentExternalId = parentsResponse?.Results.FirstOrDefault()?.Id;
    }

    var game = new Game
    {
      Name = rawgGame.Name,
      ExternalId = rawgGame.Id,
      ImageUrl = rawgGame.Background_Image,
      Description = rawgGame.Description,
      Website = rawgGame.Website,
      Rating = rawgGame.Rating,
      Platforms = rawgGame.Platforms.Select(p => p.Platform.Name).ToList(),
      SchemaStatus = PartyUp.Api.Models.Enums.SchemaStatus.Pending,
      ParentExternalId = parentExternalId
    };

    _db.Games.Add(game);
    await _db.SaveChangesAsync();
    return game;
  }

  public async Task<IEnumerable<PopularGameResult>> GetPopularGames(int limit)
  {
    var topGroups = await _db.UserGames
        .GroupBy(ug => ug.GameId)
        .OrderByDescending(g => g.Count())
        .Take(limit)
        .Select(g => new { GameId = g.Key, Count = g.Count() })
        .ToListAsync();

    if (topGroups.Count == 0)
      return Enumerable.Empty<PopularGameResult>();

    var gameIds = topGroups.Select(g => g.GameId).ToList();
    var games = await _db.Games
        .Where(g => gameIds.Contains(g.Id))
        .ToListAsync();

    return topGroups
        .Join(games, t => t.GameId, g => g.Id,
            (t, g) => new PopularGameResult
            {
              Id = g.Id,
              ExternalId = g.ExternalId,
              Name = g.Name,
              ImageUrl = g.ImageUrl,
              UserGameCount = t.Count
            });
  }

  public async Task TryPopulateParentExternalId(Game game)
  {
    // Already populated — nothing to do.
    if (game.ParentExternalId.HasValue)
      return;

    var parentsResponse = await _rawg.GetParentGames(game.ExternalId);
    var parentId = parentsResponse?.Results.FirstOrDefault()?.Id;

    if (parentId == null)
      return;

    game.ParentExternalId = parentId;
    await _db.SaveChangesAsync();
  }
}
