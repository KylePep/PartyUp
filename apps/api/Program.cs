using FantaZDB.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<CharacterService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

var app = builder.Build();

app.UseCors("AllowFrontend");

app.MapGet("/api/characters", (CharacterService service) =>
{
    return service.GetAll();
});

app.Run();
