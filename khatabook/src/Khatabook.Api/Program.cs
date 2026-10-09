using LinqToDB;
using LinqToDB.AspNet;
using LinqToDB.Async;
using LinqToDB.DataProvider.PostgreSQL;
using Microsoft.OpenApi;
using Khatabook.Api.Domain;
using Khatabook.Api.Infrastructure.Context;
using Khatabook.Api.Infrastructure.Data;
using Khatabook.Api.Infrastructure.Logging;
using Khatabook.Api.Migrations;
using Serilog;
using Serilog.Events;
using ILogger = Microsoft.Extensions.Logging.ILogger;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog: Structured Console + Rolling Daily JSON File Sink
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.File(
        path: "logs/stockstorekhata-audit-.json",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30,
        buffered: true)
    .CreateLogger();

builder.Host.UseSerilog();

// 1. Master Connection string
var masterConnectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Port=5432;Database=khatabook_master;Username=postgres;Password=postgres";

// 2. Register Master LinqToDB Context
builder.Services.AddLinqToDBContext<MasterDataConnection>((provider, options) =>
{
    return options.UsePostgreSQL(masterConnectionString, PostgreSQLVersion.v15);
});

// 3. Register Multi-Tenant Context & Database Service
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddScoped<ITenantDatabaseService, TenantDatabaseService>();

// 4. Register Dynamic TenantDataConnection (Dedicated DB per retailer)
builder.Services.AddScoped<TenantDataConnection>(sp =>
{
    var tenantContext = sp.GetRequiredService<ITenantContext>();
    var dbService = sp.GetRequiredService<ITenantDatabaseService>();

    var tenantConnStr = dbService
        .GetTenantConnectionStringAsync(tenantContext.TenantId, tenantContext.TenantCode)
        .GetAwaiter()
        .GetResult();

    var options = new DataOptions().UsePostgreSQL(tenantConnStr, PostgreSQLVersion.v15);
    return new TenantDataConnection(options);
});

// 5. Register Repositories
builder.Services.AddScoped(typeof(Khatabook.Api.Repositories.IGenericRepository<>), typeof(Khatabook.Api.Repositories.GenericRepository<>));
builder.Services.AddScoped<Khatabook.Api.Repositories.IPartyRepository, Khatabook.Api.Repositories.PartyRepository>();
builder.Services.AddScoped<Khatabook.Api.Repositories.IItemRepository, Khatabook.Api.Repositories.ItemRepository>();
builder.Services.AddScoped<Khatabook.Api.Repositories.IStockMovementRepository, Khatabook.Api.Repositories.StockMovementRepository>();
builder.Services.AddScoped<Khatabook.Api.Repositories.IInvoiceRepository, Khatabook.Api.Repositories.InvoiceRepository>();
builder.Services.AddScoped<Khatabook.Api.Repositories.ITransactionRepository, Khatabook.Api.Repositories.TransactionRepository>();
builder.Services.AddScoped<Khatabook.Api.Repositories.ITenantRepository, Khatabook.Api.Repositories.TenantRepository>();

// 6. Register Services
builder.Services.AddScoped<Khatabook.Api.Services.IPartyService, Khatabook.Api.Services.PartyService>();
builder.Services.AddScoped<Khatabook.Api.Services.IInventoryService, Khatabook.Api.Services.InventoryService>();
builder.Services.AddScoped<Khatabook.Api.Services.IBillingService, Khatabook.Api.Services.BillingService>();
builder.Services.AddScoped<Khatabook.Api.Services.IReportService, Khatabook.Api.Services.ReportService>();
builder.Services.AddScoped<Khatabook.Api.Services.IAuthService, Khatabook.Api.Services.AuthService>();
builder.Services.AddScoped<Khatabook.Api.Services.IMigrationService, Khatabook.Api.Services.MigrationService>();

// 7. Register Controllers & JSON options
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();

// 6. Setup Swagger Documentation
builder.Services.AddSwaggerGen();

// 7. Setup CORS for React Frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// 8. Run Automated Migrations on Startup for Master and All Tenant DBs
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Logging.ILogger<Program>>();
    try
    {
        await DatabaseMigrator.MigrateAllTenantDatabasesAsync(masterConnectionString, logger);

        // Seed initial demo retailer stores if empty
        var masterDb = scope.ServiceProvider.GetRequiredService<MasterDataConnection>();
        var tenantDbService = scope.ServiceProvider.GetRequiredService<ITenantDatabaseService>();
        await SeedInitialRetailersAsync(masterDb, tenantDbService, logger);
    }
    catch (Exception ex)
    {
        logger.LogWarning("Notice: Could not automatically connect or migrate PostgreSQL on startup. Check connection string: {Error}", ex.Message);
    }
}

// 9. Configure Pipeline
app.UseCors();

// Enable Swagger UI
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Khatabook API v1");
    c.RoutePrefix = "swagger"; // Access at /swagger
});

app.UseMiddleware<ApiAuditLoggingMiddleware>();
app.UseMiddleware<TenantMiddleware>();
app.MapControllers();

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    app.Run($"http://0.0.0.0:{port}");
}
else
{
    app.Run();
}

// Initial Seeding Routine for generic retailers
static async Task SeedInitialRetailersAsync(MasterDataConnection masterDb, ITenantDatabaseService dbService, ILogger logger)
{
    try
    {
        var hasTenants = await masterDb.Tenants.AnyAsync();
        if (!hasTenants)
        {
            logger.LogInformation("Master database empty. Provisioning initial default retailers: 'agro1' and 'kirana1'...");

            // Retailer 1: Agro Store
            var agro = await dbService.ProvisionNewTenantDatabaseAsync(
                "agro1",
                "Kisan Agro Seeds & Fertilizer Center",
                "Agro",
                "9876500001",
                "agro1@khatabook.local",
                "Main Mandi Road, Sector 4",
                "07AAAAA0000A1Z5",
                "₹"
            );

            var passwordHash = BCrypt.Net.BCrypt.HashPassword("123456");
            var agroUser = new MasterUser
            {
                Id = Guid.NewGuid(),
                Name = "Ramesh (Agro Owner)",
                Email = "agro1@khatabook.local",
                Phone = "9876500001",
                PasswordHash = passwordHash,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            await masterDb.InsertAsync(agroUser);
            await masterDb.InsertAsync(new UserTenant
            {
                Id = Guid.NewGuid(),
                UserId = agroUser.Id,
                TenantId = agro.Id,
                Role = "Owner",
                CreatedAt = DateTime.UtcNow
            });

            // Retailer 2: Kirana / Supermarket
            var kirana = await dbService.ProvisionNewTenantDatabaseAsync(
                "kirana1",
                "Shree Ganesh Super Kirana Store",
                "Kirana",
                "9876500002",
                "kirana1@khatabook.local",
                "Shop #12, Market Complex",
                "07BBBBB1111B1Z6",
                "₹"
            );

            var kiranaUser = new MasterUser
            {
                Id = Guid.NewGuid(),
                Name = "Suresh (Kirana Owner)",
                Email = "kirana1@khatabook.local",
                Phone = "9876500002",
                PasswordHash = passwordHash,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            await masterDb.InsertAsync(kiranaUser);
            await masterDb.InsertAsync(new UserTenant
            {
                Id = Guid.NewGuid(),
                UserId = kiranaUser.Id,
                TenantId = kirana.Id,
                Role = "Owner",
                CreatedAt = DateTime.UtcNow
            });

            logger.LogInformation("Default retailers 'agro1' and 'kirana1' successfully provisioned with dedicated databases!");
        }
    }
    catch (Exception ex)
    {
        logger.LogWarning("Notice while seeding initial retailers: {Error}", ex.Message);
    }
}
