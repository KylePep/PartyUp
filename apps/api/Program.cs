using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Services;
using PartyUp.Api.Services.Interfaces;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

using Microsoft.OpenApi.Models;
using System.Text;
using PartyUp.Api.Infrastructure.Clients;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

#region Services
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter());
    });
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));



builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddHttpClient<RawgClient>();
builder.Services.AddHttpClient("anthropic");
builder.Services.AddScoped<IGameService, GameService>();
builder.Services.AddScoped<IUserGameService, UserGameService>();
builder.Services.AddScoped<ICharacterService, CharacterService>();
builder.Services.AddScoped<ICharacterInteractionService, CharacterInteractionService>();
builder.Services.AddScoped<ICharacterMatchService, CharacterMatchService>();
builder.Services.AddScoped<IAnthropicService, AnthropicService>();
builder.Services.AddScoped<IGameFieldDefinitionService, GameFieldDefinitionService>();
builder.Services.AddScoped<IGameSchemaGenerationService, GameSchemaGenerationService>();
builder.Services.AddScoped<IGcsStorageService, GcsStorageService>();

builder.Services.AddRateLimiter(options =>
{
    var authLimit = builder.Configuration.GetValue<int>("RateLimit:AuthPermitLimit", 5);

    // Auth endpoints: 5 attempts per minute per IP (brute-force guard)
    options.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = authLimit,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));

    // Game search: 60 requests per minute per authenticated user (RAWG quota protection)
    options.AddPolicy("game-search", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                          ?? context.Connection.RemoteIpAddress?.ToString()
                          ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));

    // Anthropic schema regeneration: 2 per 5 minutes per user (cost control)
    options.AddPolicy("ai-schema", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                          ?? context.Connection.RemoteIpAddress?.ToString()
                          ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 2,
                Window = TimeSpan.FromMinutes(5),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));

    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsync("Rate limit exceeded. Please try again later.", token);
    };
});

#endregion

#region Authentication

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

builder.Services.AddAuthorization();

#endregion

#region Swagger

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

#endregion

#region CORS

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            var origins = builder.Configuration
                .GetSection("AllowedOrigins")
                .Get<string[]>() ?? [];
            policy.WithOrigins(origins)
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
});

#endregion



var app = builder.Build();

if (!string.IsNullOrEmpty(app.Configuration.GetConnectionString("DefaultConnection")))
{
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

#region Middleware

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGet("/api/health", () =>
{
    return Results.Ok(new
    {
        status = "healthy"
    });
});

app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
#endregion

app.MapControllers();

app.Run();

public partial class Program { }