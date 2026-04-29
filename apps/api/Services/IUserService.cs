using PartyUp.Api.Domain.Models;

public interface IUserService
{
  Task<List<User>> GetAll();
  Task<User?> GetById(Guid id);
  Task<User> Create(User user);
  Task<bool> Update(User user);
  Task<bool> Delete(Guid id);
}