using LinqToDB;
using LinqToDB.Async;
using Khatabook.Api.Domain;
using Khatabook.Api.Infrastructure.Data;

namespace Khatabook.Api.Repositories;

public class TransactionRepository : GenericRepository<Transaction>, ITransactionRepository
{
    public TransactionRepository(TenantDataConnection db) : base(db) { }

    public async Task<Transaction> CreateAsync(Transaction transaction)
    {
        return await InsertAsync(transaction);
    }

    public async Task<List<Transaction>> GetByPartyIdAsync(Guid partyId, bool? isActive = true)
    {
        var query = Db.Transactions.Where(t => t.PartyId == partyId);
        if (isActive.HasValue)
        {
            query = query.Where(t => t.IsActive == isActive.Value);
        }

        return await query
            .OrderByDescending(t => t.TxnDate)
            .ToListAsync();
    }

    public async Task<List<Transaction>> GetByDateRangeAsync(DateTime from, DateTime to)
    {
        return await Db.Transactions
            .Where(t => t.TxnDate >= from && t.TxnDate <= to && t.IsActive)
            .OrderByDescending(t => t.TxnDate)
            .ToListAsync();
    }
}
