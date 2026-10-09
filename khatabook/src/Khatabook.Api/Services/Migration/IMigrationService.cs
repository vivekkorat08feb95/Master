using Khatabook.Api.Domain;
using Khatabook.Api.DTOs;

namespace Khatabook.Api.Services;

public interface IMigrationService
{
    Task<object> ImportPartiesAsync(BulkImportPartiesRequest req);
    Task<object> ImportItemsAsync(BulkImportItemsRequest req);
    Task<object> ImportInvoicesAsync(BulkImportInvoicesRequest req);
    Task<object> UpdateTenantBrandingAsync(string tenantCode, UpdateTenantBrandingRequest req);
    Task<Tenant?> GetTenantBrandingAsync(string tenantCode);
}
