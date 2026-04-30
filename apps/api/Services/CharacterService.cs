using PartyUp.Api.Models;

namespace PartyUp.Api.Services;

public class CharacterService
{
  public List<Character> GetAll()
  {
    return new List<Character>
        {
            new() { Id = Guid.NewGuid(), Name = "Goku" },
            new() { Id = Guid.NewGuid(), Name = "Vegeta" }
        };
  }
}
