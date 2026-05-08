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

  public async Task<PagedGamesResult> SearchGames(string q, int page, List<int>? genres, List<string>? tags)
  {
    var response = await _rawg.GetGames(q, page, genres, tags);

    var games = response.Results.Select(g => new Game
    {
      Id = Guid.NewGuid(),
      ExternalId = g.Id,
      Name = g.Name,
      ImageUrl = g.Background_Image
    }).ToList();

    return new PagedGamesResult
    {
      Games = games,
      TotalCount = response.Count,
      Page = page,
      TotalPages = response.Count == 0 ? 1 : (int)Math.Ceiling(response.Count / (double)PageSize)
    };
  }

  public async Task<GameDetails?> GetGameById(int id)
  {
    var dbGame = await _db.Games
      .FirstOrDefaultAsync(g => g.ExternalId == id && g.Description != null);
    if (dbGame != null)
      return MapToDetails(dbGame);

    var rawgGame = await _rawg.GetGameById(id);
    if (rawgGame == null)
      return null;

    return new GameDetails
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

  public async Task<GameDetails?> GetGameByDbId(Guid id)
  {
    var game = await _db.Games.FindAsync(id);
    return game == null ? null : MapToDetails(game);
  }

  public async Task<GameDetails?> GetAndPersistGameDetails(Game game)
  {
    var rawgGame = await _rawg.GetGameById(game.ExternalId);
    if (rawgGame == null)
      return null;

    game.Description = rawgGame.Description;
    game.Website = rawgGame.Website;
    game.Rating = rawgGame.Rating;
    game.Platforms = rawgGame.Platforms.Select(p => p.Platform.Name).ToList();

    await _db.SaveChangesAsync();
    return MapToDetails(game);
  }

  private static GameDetails MapToDetails(Game g) => new()
  {
    ExternalId = g.ExternalId,
    Name = g.Name,
    Description = g.Description ?? string.Empty,
    ImageUrl = g.ImageUrl,
    Website = g.Website,
    Rating = g.Rating,
    Platforms = g.Platforms
  };
}
