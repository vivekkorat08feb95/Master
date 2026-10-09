using LinqToDB;
using LinqToDB.Async;
using LinqToDB.Configuration;
using LinqToDB.Data;
using LinqToDB.DataProvider.PostgreSQL;
using Npgsql;
using Khatabook.Api.Domain;
using Khatabook.Api.Infrastructure.Context;
using Khatabook.Api.Migrations;

namespace Khatabook.Api.Infrastructure.Data;

// Master DB Connection
public class MasterDataConnection : DataConnection
{
    public MasterDataConnection(DataOptions options) : base(options) { }

    public ITable<Tenant> Tenants => this.GetTable<Tenant>();
    public ITable<MasterUser> Users => this.GetTable<MasterUser>();
    public ITable<UserTenant> UserTenants => this.GetTable<UserTenant>();
    public ITable<AuditLog> AuditLogs => this.GetTable<AuditLog>();
}

// Tenant Isolated DB Connection
public class TenantDataConnection : DataConnection
{
    public TenantDataConnection(DataOptions options) : base(options) { }

    public ITable<Party> Parties => this.GetTable<Party>();
    public ITable<Item> Items => this.GetTable<Item>();
    public ITable<StockMovement> StockMovements => this.GetTable<StockMovement>();
    public ITable<Invoice> Invoices => this.GetTable<Invoice>();
    public ITable<InvoiceItem> InvoiceItems => this.GetTable<InvoiceItem>();
    public ITable<Transaction> Transactions => this.GetTable<Transaction>();
}

public interface ITenantDatabaseService
{
    Task<string> GetTenantConnectionStringAsync(Guid? tenantId, string? tenantCode);
    Task<Tenant> ProvisionNewTenantDatabaseAsync(
        string code,
        string name,
        string businessType,
        string? phone,
        string? email,
        string? address,
        string? gstin,
        string? currencySymbol
    );
    Task SeedIndustryDefaultsAsync(TenantDataConnection db, string businessType);
}

public class TenantDatabaseService : ITenantDatabaseService
{
    private readonly IConfiguration _config;
    private readonly MasterDataConnection _masterDb;
    private readonly ILogger<TenantDatabaseService> _logger;

    public TenantDatabaseService(
        IConfiguration config,
        MasterDataConnection masterDb,
        ILogger<TenantDatabaseService> logger)
    {
        _config = config;
        _masterDb = masterDb;
        _logger = logger;
    }

    public async Task<string> GetTenantConnectionStringAsync(Guid? tenantId, string? tenantCode)
    {
        var masterConnStr = _config.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=khatabook_master;Username=postgres;Password=postgres";

        Tenant? tenant = null;

        if (tenantId.HasValue && tenantId.Value != Guid.Empty)
        {
            tenant = (await _masterDb.Tenants.Where(t => t.Id == tenantId.Value && t.IsActive).ToListAsync()).FirstOrDefault();
        }
        else if (!string.IsNullOrWhiteSpace(tenantCode))
        {
            var code = tenantCode.Trim().ToLowerInvariant();
            tenant = (await _masterDb.Tenants.Where(t => t.Code == code && t.IsActive).ToListAsync()).FirstOrDefault();
        }

        // If no specific tenant requested, use the first active tenant or fallback
        if (tenant == null)
        {
            tenant = (await _masterDb.Tenants.Where(t => t.IsActive).OrderBy(t => t.CreatedAt).ToListAsync()).FirstOrDefault();
        }

        var dbName = tenant != null ? tenant.DatabaseName : "khatabook_tenant_default";

        // Build tuned multi-tenant connection string (MinPoolSize=0, MaxPoolSize=5, idle reclaim)
        var builder = DatabaseMigrator.BuildOptimizedTenantConnectionStringBuilder(masterConnStr, dbName, maxPoolSize: 5);
        var tenantConnStr = builder.ConnectionString;

        // JIT (Just-In-Time) Verification: Ensures tenant schema is migrated before queries run (cached in-memory, 0ms on subsequent calls)
        DatabaseMigrator.EnsureTenantMigrated(tenantConnStr, dbName, _logger);

        return tenantConnStr;
    }

    public async Task<Tenant> ProvisionNewTenantDatabaseAsync(
        string code,
        string name,
        string businessType,
        string? phone,
        string? email,
        string? address,
        string? gstin,
        string? currencySymbol)
    {
        var sanitizedCode = code.Trim().ToLowerInvariant().Replace(" ", "_");
        var dbName = $"khatabook_tenant_{sanitizedCode}";

        var masterConnStr = _config.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=khatabook_master;Username=postgres;Password=postgres";

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Code = sanitizedCode,
            Name = name.Trim(),
            BusinessType = string.IsNullOrWhiteSpace(businessType) ? "Kirana" : businessType.Trim(),
            DatabaseName = dbName,
            Phone = phone?.Trim(),
            Email = email?.Trim(),
            Address = address?.Trim(),
            Gstin = gstin?.Trim(),
            CurrencySymbol = string.IsNullOrWhiteSpace(currencySymbol) ? "₹" : currencySymbol.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // 1. Insert into Master DB
        await _masterDb.InsertAsync(tenant);

        // 2. Build tuned connection string for new tenant DB
        var tenantConnBuilder = DatabaseMigrator.BuildOptimizedTenantConnectionStringBuilder(masterConnStr, dbName, maxPoolSize: 5);
        var tenantConnStr = tenantConnBuilder.ConnectionString;

        // 3. Auto-Migrate the new tenant database using DbUp
        _logger.LogInformation("Creating dedicated database '{DbName}' for tenant '{Code}'...", dbName, sanitizedCode);
        DatabaseMigrator.MigrateTenantDatabase(tenantConnStr, _logger);

        // 4. Seed industry specific master items & units
        var tenantOptions = new DataOptions().UsePostgreSQL(tenantConnStr, PostgreSQLVersion.v15);
        using var tenantDb = new TenantDataConnection(tenantOptions);
        await SeedIndustryDefaultsAsync(tenantDb, tenant.BusinessType);

        return tenant;
    }

    public async Task SeedIndustryDefaultsAsync(TenantDataConnection db, string businessType)
    {
        var bType = businessType.ToLowerInvariant();

        if (bType.Contains("agro"))
        {
            // Seeds for Agro Store
            await db.InsertAsync(new Item
            {
                Id = Guid.NewGuid(),
                Name = "Hybrid Wheat Seeds (HD-2967)",
                Category = "Seeds",
                Unit = "Bag",
                PurchasePrice = 850.00m,
                SellingPrice = 1050.00m,
                CurrentStock = 40.000m,
                MinStockAlert = 5.000m,
                BatchNumber = "WHT-2026-B1",
                ExpiryDate = DateTime.UtcNow.AddYears(1)
            });
            await db.InsertAsync(new Item
            {
                Id = Guid.NewGuid(),
                Name = "Urea Fertilizer 45kg",
                Category = "Fertilizers",
                Unit = "Bag",
                PurchasePrice = 242.00m,
                SellingPrice = 266.50m,
                CurrentStock = 100.000m,
                MinStockAlert = 15.000m,
                BatchNumber = "IFFCO-U45"
            });
            await db.InsertAsync(new Item
            {
                Id = Guid.NewGuid(),
                Name = "Chlorpyrifos 20% EC (1 Litre)",
                Category = "Pesticides",
                Unit = "Ltr",
                PurchasePrice = 320.00m,
                SellingPrice = 420.00m,
                CurrentStock = 25.000m,
                MinStockAlert = 5.000m,
                BatchNumber = "CHL-9981",
                ExpiryDate = DateTime.UtcNow.AddYears(2)
            });
        }
        else if (bType.Contains("pharma") || bType.Contains("med"))
        {
            // Seeds for Medical / Pharmacy
            await db.InsertAsync(new Item
            {
                Id = Guid.NewGuid(),
                Name = "Paracetamol 650mg Tablets (Dolo)",
                Category = "Tablets",
                Unit = "Strip",
                PurchasePrice = 22.50m,
                SellingPrice = 30.00m,
                CurrentStock = 80.000m,
                MinStockAlert = 10.000m,
                BatchNumber = "DL-650-A",
                ExpiryDate = DateTime.UtcNow.AddYears(2)
            });
            await db.InsertAsync(new Item
            {
                Id = Guid.NewGuid(),
                Name = "Amoxicillin 500mg Capsules",
                Category = "Antibiotics",
                Unit = "Strip",
                PurchasePrice = 45.00m,
                SellingPrice = 68.00m,
                CurrentStock = 30.000m,
                MinStockAlert = 5.000m,
                BatchNumber = "AMX-501",
                ExpiryDate = DateTime.UtcNow.AddMonths(18)
            });
        }
        else if (bType.Contains("garage") || bType.Contains("auto") || bType.Contains("vehicle"))
        {
            // Seeds for Vehicle Garage & Spares
            await db.InsertAsync(new Item
            {
                Id = Guid.NewGuid(),
                Name = "Engine Oil 10W-40 (Castrol 1L)",
                Category = "Lubricants",
                Unit = "Ltr",
                PurchasePrice = 380.00m,
                SellingPrice = 490.00m,
                CurrentStock = 20.000m,
                MinStockAlert = 4.000m,
                PartNumber = "OIL-CAS-10W40"
            });
            await db.InsertAsync(new Item
            {
                Id = Guid.NewGuid(),
                Name = "General Full Service & Wash",
                Category = "Labor/Service",
                Unit = "Service",
                PurchasePrice = 0.00m,
                SellingPrice = 450.00m,
                CurrentStock = 999.000m,
                MinStockAlert = 0.000m
            });
            await db.InsertAsync(new Item
            {
                Id = Guid.NewGuid(),
                Name = "Front Brake Shoe / Pads Set",
                Category = "Spare Parts",
                Unit = "Set",
                PurchasePrice = 180.00m,
                SellingPrice = 280.00m,
                CurrentStock = 12.000m,
                MinStockAlert = 2.000m,
                PartNumber = "BRK-PAD-01"
            });
        }
        else
        {
            // Default Kirana / General Store
            await db.InsertAsync(new Item
            {
                Id = Guid.NewGuid(),
                Name = "Basmati Rice 1kg",
                Category = "Grains",
                Unit = "Kg",
                PurchasePrice = 80.00m,
                SellingPrice = 110.00m,
                CurrentStock = 50.000m,
                MinStockAlert = 10.000m
            });
            await db.InsertAsync(new Item
            {
                Id = Guid.NewGuid(),
                Name = "Tata Salt 1kg",
                Category = "Grocery",
                Unit = "Pcs",
                PurchasePrice = 22.00m,
                SellingPrice = 28.00m,
                CurrentStock = 15.000m,
                MinStockAlert = 5.000m
            });
        }
    }
}
