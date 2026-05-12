using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PartyUp.Api.Infrastructure.Clients;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Factories;

public class ApiFactory : WebApplicationFactory<Program>
{
    public const string TestConnectionString =
        "Host=localhost;Port=5432;Database=partyup_test;Username=partyup;Password=partyup";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration(config =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Rawg:ApiKey"] = "ci-test-fake-rawg-key"
            });
        });

        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor != null)
                services.Remove(descriptor);

            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(TestConnectionString));

            services.AddHttpClient<RawgClient>()
                .ConfigurePrimaryHttpMessageHandler(() => new FakeRawgHandler());
        });
    }
}
