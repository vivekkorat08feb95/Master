using Khatabook.Api.Domain;
using Khatabook.Api.DTOs;
using Khatabook.Api.Repositories;

namespace Khatabook.Api.Services;

public class InventoryService : IInventoryService
{
    private readonly IItemRepository _itemRepo;
    private readonly IStockMovementRepository _movementRepo;

    public InventoryService(IItemRepository itemRepo, IStockMovementRepository movementRepo)
    {
        _itemRepo = itemRepo;
        _movementRepo = movementRepo;
    }

    public async Task<List<Item>> GetItemsAsync(string? search, string? category, bool? isActive = true)
    {
        return await _itemRepo.GetAllAsync(search, category, isActive);
    }

    public async Task<List<Item>> GetLowStockItemsAsync()
    {
        return await _itemRepo.GetLowStockAsync();
    }

    public async Task<object?> GetItemDetailsAsync(Guid id)
    {
        var item = await _itemRepo.GetByIdAsync(id);
        if (item == null) return null;

        var history = await _movementRepo.GetHistoryByItemIdAsync(id);
        return new
        {
            Item = item,
            StockHistory = history
        };
    }

    public async Task<Item> CreateItemAsync(CreateItemRequest req)
    {
        var item = new Item
        {
            Id = Guid.NewGuid(),
            Name = req.Name.Trim(),
            NativeName = req.NativeName?.Trim(),
            Barcode = req.Barcode?.Trim(),
            Sku = req.Sku?.Trim(),
            Category = string.IsNullOrWhiteSpace(req.Category) ? "General" : req.Category.Trim(),
            Unit = string.IsNullOrWhiteSpace(req.Unit) ? "Pcs" : req.Unit.Trim(),
            PurchasePrice = req.PurchasePrice,
            SellingPrice = req.SellingPrice,
            Mrp = req.Mrp,
            TaxRate = req.TaxRate,
            HsnCode = req.HsnCode?.Trim(),
            BatchNumber = req.BatchNumber?.Trim(),
            ExpiryDate = req.ExpiryDate,
            MfgDate = req.MfgDate,
            SerialImei = req.SerialImei?.Trim(),
            PartNumber = req.PartNumber?.Trim(),
            WholesalePrice = req.WholesalePrice,
            SecondaryUnit = req.SecondaryUnit?.Trim(),
            UnitConversionRatio = req.UnitConversionRatio > 0 ? req.UnitConversionRatio : 1.0000m,
            CurrentStock = req.OpeningStock,
            MinStockAlert = req.MinStockAlert,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _itemRepo.CreateAsync(item);

        if (req.OpeningStock != 0)
        {
            await _movementRepo.CreateAsync(new StockMovement
            {
                Id = Guid.NewGuid(),
                ItemId = item.Id,
                MovementType = "INITIAL",
                Quantity = req.OpeningStock,
                UnitPrice = req.PurchasePrice,
                StockAfter = req.OpeningStock,
                Reason = "Opening Stock",
                BatchNumber = item.BatchNumber,
                Notes = "Initial inventory registration",
                CreatedAt = DateTime.UtcNow
            });
        }

        return item;
    }

    public async Task<Item?> UpdateItemAsync(Guid id, CreateItemRequest req)
    {
        var item = await _itemRepo.GetByIdAsync(id);
        if (item == null) return null;

        item.Name = req.Name.Trim();
        item.NativeName = req.NativeName?.Trim();
        item.Barcode = req.Barcode?.Trim();
        item.Sku = req.Sku?.Trim();
        item.Category = req.Category?.Trim() ?? "General";
        item.Unit = req.Unit?.Trim() ?? "Pcs";
        item.PurchasePrice = req.PurchasePrice;
        item.SellingPrice = req.SellingPrice;
        item.Mrp = req.Mrp;
        item.TaxRate = req.TaxRate;
        item.HsnCode = req.HsnCode?.Trim();
        item.BatchNumber = req.BatchNumber?.Trim();
        item.ExpiryDate = req.ExpiryDate;
        item.MfgDate = req.MfgDate;
        item.SerialImei = req.SerialImei?.Trim();
        item.PartNumber = req.PartNumber?.Trim();
        item.MinStockAlert = req.MinStockAlert;
        item.UpdatedAt = DateTime.UtcNow;

        await _itemRepo.UpdateAsync(item);
        return item;
    }

    public async Task<bool> SoftDeleteItemAsync(Guid id)
    {
        var item = await _itemRepo.GetByIdAsync(id);
        if (item == null) return false;
        await _itemRepo.DeleteAsync(id);
        return true;
    }

    public async Task<bool> ToggleItemActiveAsync(Guid id)
    {
        return await _itemRepo.ToggleActiveAsync(id);
    }

    public async Task<object> AdjustStockAsync(StockAdjustmentRequest req)
    {
        var item = await _itemRepo.GetByIdAsync(req.ItemId);
        if (item == null) throw new KeyNotFoundException("Item not found.");

        var adjType = req.AdjustmentType.Trim().ToUpperInvariant();
        decimal delta = adjType == "ADD" ? req.Quantity : -req.Quantity;
        decimal newStock = item.CurrentStock + delta;

        item.CurrentStock = newStock;
        item.UpdatedAt = DateTime.UtcNow;
        await _itemRepo.UpdateAsync(item);

        var movement = new StockMovement
        {
            Id = Guid.NewGuid(),
            ItemId = item.Id,
            MovementType = adjType == "ADD" ? "ADJUSTMENT_ADD" : "ADJUSTMENT_SUB",
            Quantity = req.Quantity,
            UnitPrice = item.PurchasePrice,
            StockAfter = newStock,
            Reason = req.Reason.Trim(),
            BatchNumber = req.BatchNumber ?? item.BatchNumber,
            Notes = req.Notes,
            CreatedAt = DateTime.UtcNow
        };

        await _movementRepo.CreateAsync(movement);

        return new
        {
            Item = item,
            Movement = movement
        };
    }

    public async Task<object> ReconcileStockAuditAsync(StockAuditReconcileRequest req)
    {
        var item = await _itemRepo.GetByIdAsync(req.ItemId);
        if (item == null) throw new KeyNotFoundException("Item not found.");

        decimal previousStock = item.CurrentStock;
        decimal discrepancy = req.PhysicalCount - previousStock;
        string status = discrepancy == 0 ? "MATCHED" : (discrepancy > 0 ? "SURPLUS" : "DEFICIT");

        StockMovement movement;
        if (discrepancy == 0)
        {
            movement = new StockMovement
            {
                Id = Guid.NewGuid(),
                ItemId = item.Id,
                MovementType = "AUDIT_VERIFIED",
                Quantity = 0,
                UnitPrice = item.PurchasePrice,
                StockAfter = item.CurrentStock,
                Reason = "Physical Shelf Audit: Count Verified (0 Discrepancy)",
                Notes = req.Notes ?? "Physical count matches book stock exactly",
                CreatedAt = DateTime.UtcNow
            };
        }
        else
        {
            item.CurrentStock = req.PhysicalCount;
            item.UpdatedAt = DateTime.UtcNow;
            await _itemRepo.UpdateAsync(item);

            movement = new StockMovement
            {
                Id = Guid.NewGuid(),
                ItemId = item.Id,
                MovementType = "AUDIT_RECONCILE",
                Quantity = Math.Abs(discrepancy),
                UnitPrice = item.PurchasePrice,
                StockAfter = req.PhysicalCount,
                Reason = $"Physical Shelf Audit: {req.DiscrepancyReason} (Book: {previousStock:G29}, Physical: {req.PhysicalCount:G29}, Diff: {(discrepancy > 0 ? "+" : "")}{discrepancy:G29})",
                Notes = req.Notes,
                CreatedAt = DateTime.UtcNow
            };
        }

        await _movementRepo.CreateAsync(movement);

        return new
        {
            Item = item,
            PreviousStock = previousStock,
            PhysicalCount = req.PhysicalCount,
            Discrepancy = discrepancy,
            Status = status,
            Movement = movement
        };
    }

    public async Task<object> GetDailyStockRegisterAsync(DateTime? date)
    {
        var targetDate = (date ?? DateTime.UtcNow).Date;
        var nextDate = targetDate.AddDays(1);

        var items = await _itemRepo.GetAllAsync(null, null);
        var dayMovements = await _movementRepo.GetMovementsByDateRangeAsync(targetDate, nextDate);

        var movementsByItem = dayMovements.GroupBy(m => m.ItemId)
            .ToDictionary(g => g.Key, g => g.OrderBy(m => m.CreatedAt).ToList());

        var registerRows = items.Select(item =>
        {
            movementsByItem.TryGetValue(item.Id, out var itemMovements);
            itemMovements ??= new List<StockMovement>();

            decimal inwardQty = itemMovements
                .Where(m => m.MovementType == "PURCHASE" || m.MovementType == "ADJUSTMENT_ADD" || m.MovementType == "INITIAL" || m.MovementType == "SALE_RETURN" || m.MovementType == "RETURN")
                .Sum(m => m.Quantity);

            decimal outwardQty = itemMovements
                .Where(m => m.MovementType == "SALE" || m.MovementType == "ADJUSTMENT_SUB")
                .Sum(m => m.Quantity);

            decimal auditDiscrepancyQty = itemMovements
                .Where(m => m.MovementType == "AUDIT_RECONCILE")
                .Sum(m => m.Quantity);

            decimal openingStock;
            decimal closingStock;

            if (itemMovements.Count > 0)
            {
                var first = itemMovements.First();
                decimal firstDelta = (first.MovementType == "SALE" || first.MovementType == "ADJUSTMENT_SUB")
                    ? -first.Quantity
                    : first.Quantity;
                openingStock = first.StockAfter - firstDelta;
                closingStock = itemMovements.Last().StockAfter;
            }
            else
            {
                openingStock = item.CurrentStock;
                closingStock = item.CurrentStock;
            }

            decimal closingValue = closingStock * item.PurchasePrice;

            return new
            {
                ItemId = item.Id,
                Name = item.Name,
                NativeName = item.NativeName,
                Barcode = item.Barcode,
                Category = item.Category,
                Unit = item.Unit,
                PurchasePrice = item.PurchasePrice,
                SellingPrice = item.SellingPrice,
                OpeningStock = openingStock,
                InwardQty = inwardQty,
                OutwardQty = outwardQty,
                AuditDiscrepancyQty = auditDiscrepancyQty,
                ClosingStock = closingStock,
                ClosingValue = closingValue,
                MovementsCount = itemMovements.Count,
                HasActivity = itemMovements.Count > 0
            };
        }).OrderByDescending(r => r.HasActivity).ThenBy(r => r.Name).ToList();

        decimal totalInward = registerRows.Sum(r => r.InwardQty);
        decimal totalOutward = registerRows.Sum(r => r.OutwardQty);
        decimal totalValuation = registerRows.Sum(r => r.ClosingValue);
        int activeCount = registerRows.Count(r => r.HasActivity);

        return new
        {
            Date = targetDate,
            TotalItemsCount = items.Count,
            ActiveItemsCount = activeCount,
            TotalInwardQty = totalInward,
            TotalOutwardQty = totalOutward,
            NetMovementQty = totalInward - totalOutward,
            TotalValuation = totalValuation,
            Rows = registerRows
        };
    }

    public async Task<List<StockMovement>> GetItemStockHistoryAsync(Guid itemId)
    {
        return await _movementRepo.GetHistoryByItemIdAsync(itemId);
    }
}
