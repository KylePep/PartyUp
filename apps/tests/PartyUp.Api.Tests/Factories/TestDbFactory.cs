using Microsoft.Extensions.DependencyInjection;
using PartyUp.Api.Infrastructure.Data;

public class TestDbFactory
{
  private readonly IServiceScopeFactory _scopeFactory;

  public TestDbFactory(IServiceScopeFactory scopeFactory)
  {
    _scopeFactory = scopeFactory;
  }

  public async Task ExecuteAsync(Func<AppDbContext, Task> action)
  {
    using var scope = _scopeFactory.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await action(db);
    await db.SaveChangesAsync();
  }
}
