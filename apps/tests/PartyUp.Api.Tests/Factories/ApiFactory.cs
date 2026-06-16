using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PartyUp.Api.Infrastructure.Clients;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Services.Interfaces;
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
                ["Rawg:ApiKey"] = "ci-test-fake-rawg-key",
                ["Anthropic:ApiKey"] = "ci-test-fake-anthropic-key",
                ["GoogleCloudStorage:BucketName"] = "test-bucket",
                ["Jwt:Issuer"] = "partyup-api",
                ["Jwt:Audience"] = "partyup-client",
                ["RateLimit:AuthPermitLimit"] = "1000",
                ["AllowedOrigins:0"] = "http://localhost:5173"
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

            services.AddHttpClient("anthropic")
                .ConfigurePrimaryHttpMessageHandler(() => new FakeAnthropicHandler());

            var gcsDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(IGcsStorageService));
            if (gcsDescriptor != null)
                services.Remove(gcsDescriptor);
            services.AddScoped<IGcsStorageService, FakeGcsService>();

            var schemaDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(IGameSchemaGenerationService));
            if (schemaDescriptor != null)
                services.Remove(schemaDescriptor);
            services.AddScoped<IGameSchemaGenerationService, NoOpGameSchemaGenerationService>();
        });
    }
}
