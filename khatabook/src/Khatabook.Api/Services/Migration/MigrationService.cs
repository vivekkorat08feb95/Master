using Khatabook.Api.Domain;
using Khatabook.Api.DTOs;
using Khatabook.Api.Repositories;

namespace Khatabook.Api.Services;

public class MigrationService : IMigrationService
{
    private readonly IPartyRepository _partyRepo;
    private readonly ITransactionRepository _txnRepo;
    private readonly IItemRepository _itemRepo;
    private readonly IStockMovementRepository _movementRepo;
    private readonly IInvoiceRepository _invoiceRepo;
    private readonly ITenantRepository _tenantRepo;

    public MigrationService(
        IPartyRepository partyRepo,
        ITransactionRepository txnRepo,
        IItemRepository itemRepo,
        IStockMovementRepository movementRepo,
        IInvoiceRepository invoiceRepo,
        ITenantRepository tenantRepo)
    {
        _partyRepo = partyRepo;
        _txnRepo = txnRepo;
        _itemRepo = itemRepo;
        _movementRepo = movementRepo;
        _invoiceRepo = invoiceRepo;
        _tenantRepo = tenantRepo;
    }

    public async Task<object> ImportPartiesAsync(BulkImportPartiesRequest req)
    {
        int importedCount = 0;
        int skippedCount = 0;

        foreach (var p in req.Parties)
        {
            if (string.IsNullOrWhiteSpace(p.Name))
            {
                skippedCount++;
                continue;
            }

            var party = new Party
            {
                Id = Guid.NewGuid(),
                Name = p.Name.Trim(),
                NativeName = p.NativeName?.Trim(),
                Phone = p.Phone?.Trim(),
                Address = p.Address?.Trim(),
                PartyType = string.IsNullOrWhiteSpace(p.PartyType) ? "CUSTOMER" : p.PartyType.Trim().ToUpperInvariant(),
                VehicleNumber = p.VehicleNumber?.Trim(),
                DlNumber = p.DlNumber?.Trim(),
                OpeningBalance = p.OpeningBalance,
                CurrentBalance = p.OpeningBalance,
                IsActive = true,
                CreatedAt = p.OpeningDate ?? DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _partyRepo.InsertAsync(party);

            if (p.OpeningBalance != 0)
            {
                await _txnRepo.CreateAsync(new Transaction
                {
                    Id = Guid.NewGuid(),
                    PartyId = party.Id,
                    TxnType = p.OpeningBalance > 0 ? "DEBIT" : "CREDIT",
                    Amount = Math.Abs(p.OpeningBalance),
                    PaymentMode = "OPENING_MIGRATION",
                    Description = "Historical opening balance (Imported from previous software)",
                    TxnDate = p.OpeningDate ?? DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                });
            }

            importedCount++;
        }

        return new
        {
            Success = true,
            ImportedCount = importedCount,
            SkippedCount = skippedCount,
            Message = $"Successfully imported {importedCount} accounts with historical opening ledger balances."
        };
    }

    public async Task<object> ImportItemsAsync(BulkImportItemsRequest req)
    {
        int importedCount = 0;
        int skippedCount = 0;

        foreach (var it in req.Items)
        {
            if (string.IsNullOrWhiteSpace(it.Name))
            {
                skippedCount++;
                continue;
            }

            var item = new Item
            {
                Id = Guid.NewGuid(),
                Name = it.Name.Trim(),
                NativeName = it.NativeName?.Trim(),
                Barcode = it.Barcode?.Trim(),
                Category = string.IsNullOrWhiteSpace(it.Category) ? "General" : it.Category.Trim(),
                Unit = string.IsNullOrWhiteSpace(it.Unit) ? "Pcs" : it.Unit.Trim(),
                PurchasePrice = it.PurchasePrice,
                SellingPrice = it.SellingPrice,
                Mrp = it.Mrp,
                TaxRate = it.TaxRate,
                HsnCode = it.HsnCode?.Trim(),
                BatchNumber = it.BatchNumber?.Trim(),
                ExpiryDate = it.ExpiryDate,
                CurrentStock = it.OpeningStock,
                MinStockAlert = it.MinStockAlert > 0 ? it.MinStockAlert : 5,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _itemRepo.InsertAsync(item);

            if (it.OpeningStock != 0)
            {
                await _movementRepo.CreateAsync(new StockMovement
                {
                    Id = Guid.NewGuid(),
                    ItemId = item.Id,
                    MovementType = "INITIAL",
                    Quantity = it.OpeningStock,
                    UnitPrice = it.PurchasePrice,
                    StockAfter = it.OpeningStock,
                    Reason = "Opening Stock Migration",
                    BatchNumber = item.BatchNumber,
                    Notes = "Imported from previous software/inventory",
                    CreatedAt = DateTime.UtcNow
                });
            }

            importedCount++;
        }

        return new
        {
            Success = true,
            ImportedCount = importedCount,
            SkippedCount = skippedCount,
            Message = $"Successfully imported {importedCount} inventory catalog items with opening stock."
        };
    }

    public async Task<object> ImportInvoicesAsync(BulkImportInvoicesRequest req)
    {
        int importedCount = 0;

        foreach (var inv in req.Invoices)
        {
            var invoiceId = Guid.NewGuid();
            var invoiceType = string.IsNullOrWhiteSpace(inv.InvoiceType) ? "SALE" : inv.InvoiceType.Trim().ToUpperInvariant();
            var invoiceNumber = string.IsNullOrWhiteSpace(inv.InvoiceNumber)
                ? $"PAST-{inv.InvoiceDate:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}"
                : inv.InvoiceNumber.Trim();

            var invEntity = new Invoice
            {
                Id = invoiceId,
                InvoiceNumber = invoiceNumber,
                InvoiceType = invoiceType,
                PartyName = inv.PartyName?.Trim() ?? "Walk-in Customer",
                PartyPhone = inv.PartyPhone?.Trim(),
                Subtotal = inv.TotalAmount,
                TotalAmount = inv.TotalAmount,
                PaidAmount = inv.PaidAmount,
                PaymentStatus = inv.PaidAmount >= inv.TotalAmount ? "PAID" : (inv.PaidAmount > 0 ? "PARTIAL" : "UNPAID"),
                PaymentMode = string.IsNullOrWhiteSpace(inv.PaymentMode) ? "CASH" : inv.PaymentMode.Trim().ToUpperInvariant(),
                Notes = string.IsNullOrWhiteSpace(inv.Notes) ? "Historical Bill Import" : inv.Notes.Trim(),
                CreatedByName = inv.CreatedByName?.Trim() ?? "Previous Software",
                InvoiceDate = inv.InvoiceDate,
                CreatedAt = inv.InvoiceDate
            };

            var lineEntities = new List<InvoiceItem>();
            if (inv.Items != null && inv.Items.Any())
            {
                foreach (var line in inv.Items)
                {
                    lineEntities.Add(new InvoiceItem
                    {
                        Id = Guid.NewGuid(),
                        InvoiceId = invoiceId,
                        ItemName = line.ItemName.Trim(),
                        NativeName = line.NativeName?.Trim(),
                        Unit = string.IsNullOrWhiteSpace(line.Unit) ? "Pcs" : line.Unit.Trim(),
                        Quantity = line.Quantity,
                        UnitPrice = line.UnitPrice,
                        Total = line.Quantity * line.UnitPrice
                    });
                }
            }

            await _invoiceRepo.CreateAsync(invEntity, lineEntities);
            importedCount++;
        }

        return new
        {
            Success = true,
            ImportedCount = importedCount,
            Message = $"Successfully imported {importedCount} historical bills."
        };
    }

    public async Task<object> UpdateTenantBrandingAsync(string tenantCode, UpdateTenantBrandingRequest req)
    {
        var tenant = await _tenantRepo.GetByCodeAsync(tenantCode);
        if (tenant == null) throw new KeyNotFoundException("Tenant not found.");

        if (req.LogoUrl != null) tenant.LogoUrl = req.LogoUrl;
        if (req.Tagline != null) tenant.Tagline = req.Tagline;
        if (req.Gstin != null) tenant.Gstin = req.Gstin;
        if (req.Address != null) tenant.Address = req.Address;
        if (req.Phone != null) tenant.Phone = req.Phone;
        if (req.PrintHeaderNote != null) tenant.PrintHeaderNote = req.PrintHeaderNote;
        if (req.PrintFooterNote != null) tenant.PrintFooterNote = req.PrintFooterNote;

        tenant.UpdatedAt = DateTime.UtcNow;
        await _tenantRepo.UpdateAsync(tenant);

        return new
        {
            Success = true,
            Tenant = tenant,
            Message = "Shop branding updated successfully."
        };
    }

    public async Task<Tenant?> GetTenantBrandingAsync(string tenantCode)
    {
        return await _tenantRepo.GetByCodeAsync(tenantCode);
    }
}
