using Khatabook.Api.Domain;

namespace Khatabook.Api.Repositories;

public interface IStockMovementRepository : IGenericRepository<StockMovement>
{
    Task<StockMovement> CreateAsync(StockMovement movement);
    Task<List<StockMovement>> GetHistoryByItemIdAsync(Guid itemId);
    Task<List<StockMovement>> GetMovementsByDateRangeAsync(DateTime fromDate, DateTime toDate);
}
