using Khatabook.Api.Domain;
using Khatabook.Api.DTOs;

namespace Khatabook.Api.Services;

public interface IInventoryService
{
    Task<List<Item>> GetItemsAsync(string? search, string? category, bool? isActive = true);
    Task<List<Item>> GetLowStockItemsAsync();
    Task<object?> GetItemDetailsAsync(Guid id);
    Task<Item> CreateItemAsync(CreateItemRequest req);
    Task<Item?> UpdateItemAsync(Guid id, CreateItemRequest req);
    Task<bool> SoftDeleteItemAsync(Guid id);
    Task<bool> ToggleItemActiveAsync(Guid id);
    Task<object> AdjustStockAsync(StockAdjustmentRequest req);
    Task<object> ReconcileStockAuditAsync(StockAuditReconcileRequest req);
    Task<object> GetDailyStockRegisterAsync(DateTime? date);
    Task<List<StockMovement>> GetItemStockHistoryAsync(Guid itemId);
}
