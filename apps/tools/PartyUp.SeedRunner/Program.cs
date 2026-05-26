using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Tests.Seeders;

var connectionString =
  Environment.GetEnvironmentVariable("CONNECTION_STRING")
  ?? "Host=localhost;Port=5432;Database=partyup;Username=partyup;Password=partyup";

var services = new ServiceCollection();

services.AddDbContext<AppDbContext>(options =>
{
  options.UseNpgsql(connectionString);
});

var provider = services.BuildServiceProvider();

using var scope = provider.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

Console.WriteLine("Seeding started...");

var mode = args.FirstOrDefault() ?? "A";

Console.WriteLine($"Mode: {mode}");

if (mode == "S")
{
  var count = args.Length > 1 && int.TryParse(args[1], out var n) ? n : 50;
  await new ScaleSeeder().SeedEso(db, count);
}
else
{
  var seeder = new TestDataSeeder();
  if (mode == "A")
    await seeder.SeedSetA(db);
  else
    await seeder.SeedSetB(db);
}

Console.WriteLine("Seeding completed.");
