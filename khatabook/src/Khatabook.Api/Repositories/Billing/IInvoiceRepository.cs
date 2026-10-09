using Khatabook.Api.Domain;

namespace Khatabook.Api.Repositories;

public interface IInvoiceRepository : IGenericRepository<Invoice>
{
    Task<List<Invoice>> GetAllAsync(string? type, Guid? partyId, Guid? createdBy, string? search, int page, int pageSize, bool? isActive = true);
    Task<List<Invoice>> GetByPartyIdAsync(Guid partyId);
    Task<List<InvoiceItem>> GetItemsByInvoiceIdAsync(Guid invoiceId);
    Task<List<InvoiceItem>> GetItemsByInvoiceIdsAsync(List<Guid> invoiceIds);
    Task<List<Invoice>> GetByDateRangeAsync(DateTime fromDate, DateTime toDate);
    Task<int> GetCountByTypeAsync(string type);
    Task<Invoice> CreateAsync(Invoice invoice, List<InvoiceItem> items);
}
