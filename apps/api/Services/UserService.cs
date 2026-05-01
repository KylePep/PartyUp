using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Models;
using PartyUp.Api.Infrastructure.Data;

public class UserService : IUserService
{
  private readonly AppDbContext _context;

  public UserService(AppDbContext context)
  {
    _context = context;
  }

  public async Task<List<User>> GetAll()
    => await _context.Users.ToListAsync();

  public async Task<User?> GetById(Guid id)
    => await _context.Users.FindAsync(id);

  public async Task<User> Create(User user)
  {
    _context.Users.Add(user);
    await _context.SaveChangesAsync();
    return user;
  }

  public async Task<bool> Update(User user)
  {
    _context.Entry(user).State = EntityState.Modified;
    await _context.SaveChangesAsync();
    return true;
  }

  public async Task<bool> Delete(Guid id)
  {
    var user = await _context.Users.FindAsync(id);
    if (user == null) return false;

    _context.Users.Remove(user);
    await _context.SaveChangesAsync();
    return true;
  }
}