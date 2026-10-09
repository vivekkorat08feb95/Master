using LinqToDB;
using LinqToDB.Async;
using Khatabook.Api.Domain;
using Khatabook.Api.Infrastructure.Data;

namespace Khatabook.Api.Repositories;

public class StockMovementRepository : GenericRepository<StockMovement>, IStockMovementRepository
{
    public StockMovementRepository(TenantDataConnection db) : base(db) { }

    public async Task<StockMovement> CreateAsync(StockMovement movement)
    {
        return await InsertAsync(movement);
    }

    public async Task<List<StockMovement>> GetHistoryByItemIdAsync(Guid itemId)
    {
        return await Db.StockMovements
            .Where(sm => sm.ItemId == itemId)
            .OrderByDescending(sm => sm.CreatedAt)
            .Take(100)
            .ToListAsync();
    }

    public async Task<List<StockMovement>> GetMovementsByDateRangeAsync(DateTime fromDate, DateTime toDate)
    {
        return await Db.StockMovements
            .Where(sm => sm.CreatedAt >= fromDate && sm.CreatedAt < toDate)
            .OrderBy(sm => sm.CreatedAt)
            .ToListAsync();
    }
}
