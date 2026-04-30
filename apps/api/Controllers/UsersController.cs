using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models;


[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
  private readonly IUserService _service;

  public UsersController(IUserService service)
  {
    _service = service;
  }

  [HttpGet]
  public async Task<ActionResult<IEnumerable<User>>> GetAll()
    => await _service.GetAll();

  [HttpGet("{id}")]
  public async Task<ActionResult<User>> GetById(Guid id)
  {
    var user = await _service.GetById(id);
    return user == null ? NotFound() : user;
  }

  [HttpPost]
  public async Task<ActionResult<User>> Create(User user)
  {
    var created = await _service.Create(user);
    return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
  }

  [HttpPut("{id}")]
  public async Task<IActionResult> Update(Guid id, User updated)
  {
    if (id != updated.Id) return BadRequest();

    await _service.Update(updated);
    return NoContent();
  }

  [HttpDelete("{id}")]
  public async Task<IActionResult> Delete(Guid id)
  {
    var success = await _service.Delete(id);
    return success ? NoContent() : NotFound();
  }
}