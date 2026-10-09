using System.Collections.Concurrent;
using System.Diagnostics;
using System.Reflection;
using DbUp;
using Npgsql;

namespace Khatabook.Api.Migrations;

public static class DatabaseMigrator
{
    private static readonly Assembly Assembly = Assembly.GetExecutingAssembly();

    // High-performance in-memory cache of verified tenant databases during the application lifecycle
    private static readonly ConcurrentDictionary<string, bool> MigratedTenantDbs = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Checks if a tenant database has already completed its migrations during this application run.
    /// </summary>
    public static bool IsTenantMigrated(string databaseName) =>
        MigratedTenantDbs.ContainsKey(databaseName);

    /// <summary>
    /// Just-In-Time (JIT) Tenant Migration: Ensures a tenant database is migrated before queries execute.
    /// Uses concurrent cache to return in 0ms on all subsequent calls.
    /// </summary>
    public static void EnsureTenantMigrated(string tenantConnectionString, string databaseName, ILogger logger)
    {
        if (MigratedTenantDbs.ContainsKey(databaseName))
        {
            return;
        }

        lock (MigratedTenantDbs)
        {
            if (MigratedTenantDbs.ContainsKey(databaseName))
            {
                return;
            }

            MigrateTenantDatabase(tenantConnectionString, logger);
            MigratedTenantDbs[databaseName] = true;
        }
    }

    /// <summary>
    /// Constructs a connection string optimized for high-density multi-tenancy (prevents PostgreSQL connection exhaustion).
    /// </summary>
    public static NpgsqlConnectionStringBuilder BuildOptimizedTenantConnectionStringBuilder(
        string baseConnectionString, 
        string databaseName, 
        int maxPoolSize = 5)
    {
        return new NpgsqlConnectionStringBuilder(baseConnectionString)
        {
            Database = databaseName,
            Pooling = true,
            MinPoolSize = 0,               // Do NOT hold idle connections open for inactive tenants
            MaxPoolSize = maxPoolSize,     // Restrict per-tenant pool size to prevent exceeding max_connections
            ConnectionIdleLifetime = 15,   // Close idle connections after 15 seconds
            ConnectionPruningInterval = 10,
            Timeout = 15
        };
    }

    public static void MigrateMasterDatabase(string masterConnectionString, ILogger logger)
    {
        try
        {
            logger.LogInformation("Ensuring Master Database and applying master migrations...");
            EnsureDatabase.For.PostgresqlDatabase(masterConnectionString);

            var upgrader = DeployChanges.To
                .PostgresqlDatabase(masterConnectionString)
                .WithScriptsEmbeddedInAssembly(Assembly, s => s.Contains(".Master.Scripts."))
                .LogToConsole()
                .Build();

            var result = upgrader.PerformUpgrade();
            if (!result.Successful)
            {
                logger.LogError(result.Error, "Master Database Migration Failed: {Error}", result.Error?.Message);
                throw new Exception($"Master DB Migration Failed: {result.Error?.Message}", result.Error);
            }

            logger.LogInformation("Master database migrated successfully.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to migrate master database.");
            throw;
        }
    }

    public static void MigrateTenantDatabase(string tenantConnectionString, ILogger logger)
    {
        try
        {
            EnsureDatabase.For.PostgresqlDatabase(tenantConnectionString);

            var upgrader = DeployChanges.To
                .PostgresqlDatabase(tenantConnectionString)
                .WithScriptsEmbeddedInAssembly(Assembly, s => s.Contains(".Tenant.Scripts."))
                .LogToConsole()
                .Build();

            var result = upgrader.PerformUpgrade();
            if (!result.Successful)
            {
                logger.LogError(result.Error, "Tenant Database Migration Failed: {Error}", result.Error?.Message);
                throw new Exception($"Tenant DB Migration Failed: {result.Error?.Message}", result.Error);
            }

            // Register in in-memory cache
            var builder = new NpgsqlConnectionStringBuilder(tenantConnectionString);
            if (!string.IsNullOrEmpty(builder.Database))
            {
                MigratedTenantDbs[builder.Database] = true;
            }

            logger.LogInformation("Tenant database '{Database}' migrated successfully.", builder.Database);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to migrate tenant database.");
            throw;
        }
    }

    /// <summary>
    /// High-Scale Parallel Migration Engine: Effortlessly migrates 1,000+ tenant databases with bounded concurrency.
    /// </summary>
    public static async Task MigrateAllTenantDatabasesAsync(
        string masterConnectionString, 
        ILogger logger, 
        int maxDegreeOfParallelism = 15)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            // 1. First ensure master DB is migrated
            MigrateMasterDatabase(masterConnectionString, logger);

            // 2. Query all registered tenant databases from master DB
            var tenantDatabases = new List<string>();

            await using (var conn = new NpgsqlConnection(masterConnectionString))
            {
                await conn.OpenAsync();
                await using var cmd = new NpgsqlCommand("SELECT database_name FROM tenants WHERE is_active = TRUE", conn);
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    tenantDatabases.Add(reader.GetString(0));
                }
            }

            int totalCount = tenantDatabases.Count;
            logger.LogInformation(
                "Discovered {Count} active tenant databases to auto-migrate. Starting parallel migration (MaxDegreeOfParallelism: {Concurrency})...",
                totalCount, maxDegreeOfParallelism);

            if (totalCount == 0)
            {
                logger.LogInformation("No active tenant databases to migrate.");
                return;
            }

            int successCount = 0;
            int failureCount = 0;

            var parallelOptions = new ParallelOptions
            {
                MaxDegreeOfParallelism = Math.Max(1, maxDegreeOfParallelism)
            };

            await Parallel.ForEachAsync(tenantDatabases, parallelOptions, async (dbName, ct) =>
            {
                try
                {
                    var tenantBuilder = BuildOptimizedTenantConnectionStringBuilder(masterConnectionString, dbName, maxPoolSize: 2);
                    MigrateTenantDatabase(tenantBuilder.ConnectionString, logger);
                    Interlocked.Increment(ref successCount);
                }
                catch (Exception ex)
                {
                    Interlocked.Increment(ref failureCount);
                    logger.LogError(ex, "Failed to migrate tenant database '{DatabaseName}'. Continuing with remaining tenants...", dbName);
                }
            });

            stopwatch.Stop();
            logger.LogInformation(
                "Tenant database parallel migration completed in {ElapsedMs}ms! Total: {Total}, Succeeded: {Succeeded}, Failed: {Failed}",
                stopwatch.ElapsedMilliseconds, totalCount, successCount, failureCount);
        }
        catch (Exception ex)
        {
            logger.LogWarning("Notice while migrating tenant databases: {Error}", ex.Message);
        }
    }
}
