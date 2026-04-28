using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Domain.Models;

namespace PartyUp.Api.Data
{
  public class AppDbContext : DbContext
  {
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    // Example table
    public DbSet<User> Users { get; set; }
  }
}
