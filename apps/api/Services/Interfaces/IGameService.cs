using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Game;

public interface IGameService
{
  Task<PagedGamesResult> SearchGames(string q, int page, List<int>? genres, bool? exclude_additions, List<string>? tags);
  Task<Game?> GetGameById(int id);
  Task<Game?> GetGameByDbId(Guid id);
  Task<Game?> getGameByExternalId(int id);
  Task<Game?> GetAndPersistGameDetails(int id);

  /// <summary>
  /// Calls RAWG's /parent-games endpoint and, if a parent is found, updates
  /// <paramref name="game"/>.ParentExternalId and saves to the DB.
  /// No-op if the game already has a ParentExternalId or if RAWG returns none.
  /// Used to backfill stale Game records that were persisted before this fix.
  /// </summary>
  Task TryPopulateParentExternalId(Game game);
  Task<IEnumerable<PopularGameResult>> GetPopularGames(int limit);
  Task<ParentPreviewResponse?> GetParentPreview(int externalId);
}
