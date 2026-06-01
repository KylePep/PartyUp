using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;

namespace PartyUp.Api.Tests.Seeders;

public static class DbInitializer
{
  public static async Task SeedAsync(AppDbContext db)
  {
    if (await db.Users.AnyAsync())
      return;

    db.Users.Add(new User
    {
      Email = "admin@example.com",
      PasswordHash = "hashed-password"
    });

    await db.SaveChangesAsync();
  }
}
