using System.Data.Common;
using Npgsql;
using Respawn;
using TestFactories = PartyUp.Api.Tests.Factories;

namespace PartyUp.Api.Tests.Infrastructure;

public static class DatabaseReset
{
    private static Respawner? _respawner;
    private static DbConnection? _connection;

    public static async Task ResetAsync()
    {
        if (_connection == null)
        {
            _connection = new NpgsqlConnection(TestFactories.ApiFactory.TestConnectionString);
            await _connection.OpenAsync();

            _respawner = await Respawner.CreateAsync(_connection, new RespawnerOptions
            {
                DbAdapter = DbAdapter.Postgres
            });
        }

        await _respawner!.ResetAsync(_connection);
    }
}
