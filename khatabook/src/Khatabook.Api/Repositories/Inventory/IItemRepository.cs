using Khatabook.Api.Domain;

namespace Khatabook.Api.Repositories;

public interface IItemRepository : IGenericRepository<Item>
{
    Task<List<Item>> GetAllAsync(string? search, string? category, bool? isActive = true);
    Task<List<Item>> GetLowStockAsync();
    Task<Item> CreateAsync(Item item);
}
