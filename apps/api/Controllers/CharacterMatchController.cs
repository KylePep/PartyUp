using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/character-matches")]
public class CharacterMatchController : ControllerBase
{
  private readonly ICharacterMatchService _service;

  public CharacterMatchController(ICharacterMatchService service)
  {
    _service = service;
  }

  [HttpPost("swipe")]
  public async Task<ActionResult<MatchResponse>> Swipe(SwipeRequest request)
  {
    var result = await _service.SwipeAsync(request);
    return Ok(result);
  }
}