using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;

public class CharacterMatchService : ICharacterMatchService
{
  private readonly AppDbContext _db;

  public CharacterMatchService(AppDbContext db)
  {
    _db = db;
  }

  public async Task<MatchResponse> SwipeAsync(SwipeRequest request)
  {
    if (request.FromCharacterId == request.ToCharacterId)
      throw new InvalidOperationException("Cannot interact with self");

    var interaction = new CharacterInteraction
    {
      Id = Guid.NewGuid(),
      FromCharacterId = request.FromCharacterId,
      ToCharacterId = request.ToCharacterId,
      Type = request.IsLike ? InteractionType.Like : InteractionType.Dislike,
      CreatedAt = DateTime.UtcNow
    };

    _db.CharacterInteractions.Add(interaction);
    await _db.SaveChangesAsync();

    if (!request.IsLike)
    {
      return new MatchResponse
      {
        IsMatch = false
      };
    }

    var reverseLikeExists = await _db.CharacterInteractions
    .AnyAsync(x =>
      x.FromCharacterId == request.ToCharacterId &&
      x.ToCharacterId == request.FromCharacterId &&
      x.Type == InteractionType.Like);

    if (!reverseLikeExists)
    {
      return new MatchResponse
      {
        IsMatch = false
      };
    }

    var (aId, bId) = Order(request.FromCharacterId, request.ToCharacterId);

    var existingMatch = await _db.CharacterMatches
        .FirstOrDefaultAsync(m =>
            m.CharacterAId == aId &&
            m.CharacterBId == bId);

    if (existingMatch != null)
    {
      return new MatchResponse
      {
        IsMatch = true,
        MatchId = existingMatch.Id,
        CharacterAId = aId,
        CharacterBId = bId,
        MatchedAt = existingMatch.MatchedAt
      };
    }

    var match = new CharacterMatch
    {
      Id = Guid.NewGuid(),
      CharacterAId = aId,
      CharacterBId = bId,
      MatchedAt = DateTime.UtcNow
    };

    _db.CharacterMatches.Add(match);
    await _db.SaveChangesAsync();

    return new MatchResponse
    {
      IsMatch = true,
      MatchId = match.Id,
      CharacterAId = aId,
      CharacterBId = bId,
      MatchedAt = match.MatchedAt
    };

  }
  private static (Guid, Guid) Order(Guid a, Guid b)
  => a.CompareTo(b) < 0 ? (a, b) : (b, a);
}