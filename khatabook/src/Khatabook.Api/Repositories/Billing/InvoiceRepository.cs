using LinqToDB;
using LinqToDB.Async;
using Khatabook.Api.Domain;
using Khatabook.Api.Infrastructure.Data;

namespace Khatabook.Api.Repositories;

public class InvoiceRepository : GenericRepository<Invoice>, IInvoiceRepository
{
    public InvoiceRepository(TenantDataConnection db) : base(db) { }

    public async Task<List<Invoice>> GetAllAsync(string? type, Guid? partyId, Guid? createdBy, string? search, int page, int pageSize, bool? isActive = true)
    {
        var query = Db.Invoices.AsQueryable();

        if (isActive.HasValue)
        {
            query = query.Where(i => i.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(type))
        {
            var upperType = type.Trim().ToUpperInvariant();
            query = query.Where(i => i.InvoiceType == upperType);
        }

        if (partyId.HasValue && partyId.Value != Guid.Empty)
        {
            query = query.Where(i => i.PartyId == partyId.Value);
        }

        if (createdBy.HasValue && createdBy.Value != Guid.Empty)
        {
            query = query.Where(i => i.CreatedBy == createdBy.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(i => i.InvoiceNumber.ToLower().Contains(term) ||
                                     (i.PartyName != null && i.PartyName.ToLower().Contains(term)) ||
                                     (i.PartyPhone != null && i.PartyPhone.ToLower().Contains(term)) ||
                                     (i.CreatedByName != null && i.CreatedByName.ToLower().Contains(term)));
        }

        return await query
            .OrderByDescending(i => i.InvoiceDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<List<Invoice>> GetByPartyIdAsync(Guid partyId)
    {
        return await Db.Invoices
            .Where(i => i.PartyId == partyId && i.IsActive)
            .OrderByDescending(i => i.InvoiceDate)
            .Take(100)
            .ToListAsync();
    }

    public async Task<List<InvoiceItem>> GetItemsByInvoiceIdAsync(Guid invoiceId)
    {
        return await Db.InvoiceItems.Where(ii => ii.InvoiceId == invoiceId).ToListAsync();
    }

    public async Task<List<InvoiceItem>> GetItemsByInvoiceIdsAsync(List<Guid> invoiceIds)
    {
        if (invoiceIds == null || !invoiceIds.Any()) return new List<InvoiceItem>();
        return await Db.InvoiceItems
            .Where(ii => invoiceIds.Contains(ii.InvoiceId))
            .ToListAsync();
    }

    public async Task<List<Invoice>> GetByDateRangeAsync(DateTime fromDate, DateTime toDate)
    {
        return await Db.Invoices
            .Where(i => i.InvoiceDate >= fromDate && i.InvoiceDate <= toDate && i.IsActive)
            .OrderBy(i => i.InvoiceDate)
            .ToListAsync();
    }

    public async Task<int> GetCountByTypeAsync(string type)
    {
        return await Db.Invoices.CountAsync(i => i.InvoiceType == type);
    }

    public async Task<Invoice> CreateAsync(Invoice invoice, List<InvoiceItem> items)
    {
        await InsertAsync(invoice);
        foreach (var item in items)
        {
            await Db.InsertAsync(item);
        }
        return invoice;
    }
}
