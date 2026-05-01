using System.Data.Common;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Respawn;

namespace PartyUp.Api.Tests.Infrastructure;

public static class DatabaseReset
{
  private static Respawner? _respawner;
  private static DbConnection? _connection;

  public static async Task ResetAsync(IServiceProvider services)
  {
    if (_connection == null)
    {
      var connectionString =
        "Host=localhost;Port=5432;Database=partyup_test;Username=postgres;Password=postgres";

      _connection = new NpgsqlConnection(connectionString);

      await _connection.OpenAsync();

      _respawner = await Respawner.CreateAsync(_connection, new RespawnerOptions
      {
        DbAdapter = DbAdapter.Postgres
      });
    }

    await _respawner!.ResetAsync(_connection);
  }
}
