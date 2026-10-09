namespace Khatabook.Api.DTOs;

public record CreateItemRequest(
    string Name,
    string? Barcode,
    string? Sku,
    string? Category,
    string Unit,
    decimal PurchasePrice,
    decimal SellingPrice,
    decimal Mrp,
    decimal TaxRate,
    string? HsnCode,
    string? BatchNumber,
    DateTime? ExpiryDate,
    DateTime? MfgDate,
    string? SerialImei,
    string? PartNumber,
    decimal OpeningStock,
    decimal MinStockAlert,
    string? NativeName = null,
    decimal WholesalePrice = 0.00m,
    string? SecondaryUnit = null,
    decimal UnitConversionRatio = 1.0000m
);

public record StockAdjustmentRequest(
    Guid ItemId,
    string AdjustmentType, // 'ADD' or 'SUBTRACT'
    decimal Quantity,
    string Reason, // 'Damage', 'Expired', 'Lost', 'Recount', 'Sample', 'Return'
    string? BatchNumber,
    string? Notes
);

public record StockAuditReconcileRequest(
    Guid ItemId,
    decimal PhysicalCount,
    string DiscrepancyReason,
    string? Notes,
    string? AuditedBy
);
