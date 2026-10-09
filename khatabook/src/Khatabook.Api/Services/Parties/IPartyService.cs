using Khatabook.Api.Domain;
using Khatabook.Api.DTOs;

namespace Khatabook.Api.Services;

public interface IPartyService
{
    Task<List<Party>> GetPartiesAsync(string? type, string? search, bool? isActive = true);
    Task<object?> GetPartyDetailsAsync(Guid id);
    Task<Party> CreatePartyAsync(CreatePartyRequest req);
    Task<Party?> UpdatePartyAsync(Guid id, CreatePartyRequest req);
    Task<bool> SoftDeletePartyAsync(Guid id);
    Task<bool> TogglePartyActiveAsync(Guid id);
    Task<object> RecordTransactionAsync(CreateTransactionRequest req);
    Task<List<Transaction>> GetPartyTransactionsAsync(Guid partyId, bool? isActive = true);
    Task<bool> SoftDeleteTransactionAsync(Guid txnId);
    Task<bool> ToggleTransactionActiveAsync(Guid txnId);
    Task<SettleUdhaarResult> SettleUdhaarAsync(Guid partyId, SettleUdhaarRequest req);
}
