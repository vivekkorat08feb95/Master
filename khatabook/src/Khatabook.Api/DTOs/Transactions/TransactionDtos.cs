namespace Khatabook.Api.DTOs;

public record CreateTransactionRequest(
    Guid PartyId,
    string TxnType, // 'DEBIT' (You Gave) or 'CREDIT' (You Got)
    decimal Amount,
    string PaymentMode, // 'CASH', 'UPI', 'BANK', 'CHEQUE'
    string? Description,
    DateTime? TxnDate
);
