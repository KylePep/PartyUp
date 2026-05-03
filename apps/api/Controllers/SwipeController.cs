using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/swipes")]
public class SwipeController : ControllerBase
{
  private readonly ICharacterMatchService _service;

  public SwipeController(ICharacterMatchService service)
  {
    _service = service;
  }

  [HttpPost]
  public async Task<ActionResult<MatchResponse>> Swipe(SwipeRequest request)
  {
    var result = await _service.SwipeAsync(request);
    return Ok(result);
  }
}
