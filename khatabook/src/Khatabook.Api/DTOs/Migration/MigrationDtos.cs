namespace Khatabook.Api.DTOs;

public record ImportPartyItem(
    string Name,
    string? NativeName,
    string? Phone,
    string? Address,
    string PartyType, // 'CUSTOMER' or 'SUPPLIER'
    decimal OpeningBalance,
    DateTime? OpeningDate,
    string? VehicleNumber,
    string? DlNumber
);

public record BulkImportPartiesRequest(
    List<ImportPartyItem> Parties
);

public record ImportInventoryItem(
    string Name,
    string? NativeName,
    string? Barcode,
    string? Category,
    string Unit,
    decimal PurchasePrice,
    decimal SellingPrice,
    decimal Mrp,
    decimal TaxRate,
    string? HsnCode,
    string? BatchNumber,
    DateTime? ExpiryDate,
    decimal OpeningStock,
    decimal MinStockAlert
);

public record BulkImportItemsRequest(
    List<ImportInventoryItem> Items
);

public record ImportInvoiceItem(
    string? InvoiceNumber,
    string InvoiceType, // 'SALE' or 'PURCHASE'
    string? PartyName,
    string? PartyPhone,
    DateTime InvoiceDate,
    decimal TotalAmount,
    decimal PaidAmount,
    string PaymentMode,
    string? Notes,
    string? CreatedByName,
    List<InvoiceItemDto>? Items
);

public record BulkImportInvoicesRequest(
    List<ImportInvoiceItem> Invoices
);
