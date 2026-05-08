using System.Data.Common;
using Npgsql;
using Respawn;
using Respawn.Graph;
using TestFactories = PartyUp.Api.Tests.Factories;

namespace PartyUp.Api.Tests.Infrastructure;

public static class DatabaseReset
{
    private static readonly SemaphoreSlim _lock = new(1, 1);
    private static Respawner? _respawner;
    private static DbConnection? _connection;

    public static async Task ResetAsync()
    {
        await _lock.WaitAsync();
        try
        {
            if (_connection == null)
            {
                _connection = new NpgsqlConnection(TestFactories.ApiFactory.TestConnectionString);
                await _connection.OpenAsync();

                _respawner = await Respawner.CreateAsync(_connection, new RespawnerOptions
                {
                    DbAdapter = DbAdapter.Postgres,
                    TablesToIgnore = [new Table("__EFMigrationsHistory")]
                });
            }

            await _respawner!.ResetAsync(_connection);
        }
        finally
        {
            _lock.Release();
        }
    }
}
