using Khatabook.Api.Domain;
using Khatabook.Api.DTOs;

namespace Khatabook.Api.Services;

public interface IBillingService
{
    Task<List<Invoice>> GetInvoicesAsync(string? type, Guid? partyId, Guid? createdBy, string? search, int page, int pageSize, bool? isActive = true);
    Task<object?> GetInvoiceDetailsAsync(Guid id);
    Task<object> CreateInvoiceAsync(CreateInvoiceRequest req);
    Task<object> ProcessInvoiceReturnAsync(CreateInvoiceReturnRequest req);
    Task<bool> SoftDeleteInvoiceAsync(Guid id);
    Task<bool> ToggleInvoiceActiveAsync(Guid id);
}
