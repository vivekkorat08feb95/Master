using LinqToDB;
using LinqToDB.Async;
using Khatabook.Api.Domain;
using Khatabook.Api.Infrastructure.Data;

namespace Khatabook.Api.Repositories;

public class ItemRepository : GenericRepository<Item>, IItemRepository
{
    public ItemRepository(TenantDataConnection db) : base(db) { }

    public async Task<List<Item>> GetAllAsync(string? search, string? category, bool? isActive = true)
    {
        var query = Db.Items.AsQueryable();

        if (isActive.HasValue)
        {
            query = query.Where(i => i.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(i => i.Category == category.Trim());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            query = query.Where(i => 
                Sql.Like(i.Name, term) || 
                (i.NativeName != null && Sql.Like(i.NativeName, term)) || 
                (i.Barcode != null && Sql.Like(i.Barcode, term)) || 
                (i.BatchNumber != null && Sql.Like(i.BatchNumber, term)) || 
                (i.PartNumber != null && Sql.Like(i.PartNumber, term)) || 
                (i.SerialImei != null && Sql.Like(i.SerialImei, term))
            );
        }

        return await query.OrderBy(i => i.Name).ToListAsync();
    }

    public async Task<List<Item>> GetLowStockAsync()
    {
        return await Db.Items
            .Where(i => i.IsActive && i.CurrentStock <= i.MinStockAlert)
            .OrderBy(i => i.CurrentStock)
            .ToListAsync();
    }

    public async Task<Item> CreateAsync(Item item)
    {
        return await InsertAsync(item);
    }
}
