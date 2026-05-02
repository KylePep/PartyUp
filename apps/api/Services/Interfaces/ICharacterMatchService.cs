public interface ICharacterMatchService
{
  Task<MatchResponse> SwipeAsync(SwipeRequest request);
}