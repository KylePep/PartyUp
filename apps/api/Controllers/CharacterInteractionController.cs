using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/character-interactions")]
[Authorize]
public class CharacterInteractionController : ControllerBase
{
  private readonly ICharacterInteractionService _service;

  public CharacterInteractionController(ICharacterInteractionService service)
  {
    _service = service;
  }

  [HttpPost]
  public async Task<ActionResult<MatchResponse>> RecordInteraction([FromBody] CharacterInteractionRequest request)
  {
    var result = await _service.RecordInteractionAsync(request);
    return Ok(result);
  }
}
