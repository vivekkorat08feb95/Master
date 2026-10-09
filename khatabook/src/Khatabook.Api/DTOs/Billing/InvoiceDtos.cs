namespace Khatabook.Api.DTOs;

public record InvoiceItemDto(
    Guid? ItemId,
    string ItemName,
    string? Unit,
    string? BatchNumber,
    DateTime? ExpiryDate,
    decimal Quantity,
    decimal UnitPrice,
    decimal DiscountAmount,
    decimal TaxRate,
    string? NativeName = null,
    string PriceTier = "RETAIL",
    string? HsnCode = null
);

public record CreateInvoiceRequest(
    string InvoiceType, // 'SALE' or 'PURCHASE'
    Guid? PartyId,
    string? PartyName,
    string? PartyPhone,
    string? VehicleNumber,
    string? DoctorName,
    string? PatientName,
    decimal DiscountAmount,
    decimal PaidAmount,
    string PaymentMode,
    string? Notes,
    List<InvoiceItemDto> Items,
    Guid? CreatedBy = null,
    string? CreatedByName = null
);

public record InvoiceReturnItemRequest(
    Guid? ItemId,
    string ItemName,
    decimal ReturnQuantity,
    decimal UnitPrice,
    decimal TaxRate,
    string? Unit = null,
    string? Reason = null
);

public record CreateInvoiceReturnRequest(
    Guid OriginalInvoiceId,
    List<InvoiceReturnItemRequest> Items,
    string RefundMode, // 'CASH', 'UPI', 'DEDUCT_UDHAAR', 'STORE_CREDIT'
    string Reason, // 'Defective / Damaged', 'Wrong Item', etc.
    string? Notes = null,
    bool RestockInventory = true,
    Guid? CreatedBy = null,
    string? CreatedByName = null
);

