namespace Khatabook.Api.DTOs;

public record CreatePartyRequest(
    string Name,
    string? Phone,
    string? Email,
    string? Address,
    string PartyType, // 'CUSTOMER' or 'SUPPLIER'
    string? VehicleNumber, // For Garage
    string? DlNumber, // For Pharmacy
    decimal OpeningBalance,
    decimal CreditLimit,
    string? NativeName = null,
    string? Gstin = null,
    string? State = "Gujarat",
    string? StateCode = "24"
);

public record SettleUdhaarRequest(
    decimal Amount,
    string PaymentMode, // 'CASH', 'UPI', 'BANK_TRANSFER'
    string? Notes = null,
    List<InvoiceSettlementAllocationDto>? Allocations = null
);

public record InvoiceSettlementAllocationDto(
    Guid InvoiceId,
    decimal AllocatedAmount
);

public record SettleUdhaarResult(
    Guid PartyId,
    string PartyName,
    decimal TotalPaid,
    decimal PreviousBalance,
    decimal NewBalance,
    List<SettledInvoiceSummaryDto> SettledInvoices,
    Guid TransactionId
);

public record SettledInvoiceSummaryDto(
    Guid InvoiceId,
    string InvoiceNumber,
    decimal OriginalAmount,
    decimal PreviousPaid,
    decimal AmountAllocated,
    decimal RemainingDue,
    string NewStatus
);
