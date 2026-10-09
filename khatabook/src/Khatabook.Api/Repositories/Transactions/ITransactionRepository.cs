using Khatabook.Api.Domain;

namespace Khatabook.Api.Repositories;

public interface ITransactionRepository : IGenericRepository<Transaction>
{
    Task<Transaction> CreateAsync(Transaction transaction);
    Task<List<Transaction>> GetByPartyIdAsync(Guid partyId, bool? isActive = true);
    Task<List<Transaction>> GetByDateRangeAsync(DateTime from, DateTime to);
}
