using Khatabook.Api.Domain;

namespace Khatabook.Api.Repositories;

public interface ITenantRepository
{
    Task<List<Tenant>> GetAllActiveAsync();
    Task<Tenant?> GetByIdAsync(Guid id);
    Task<Tenant?> GetByCodeAsync(string code);
    Task<bool> ExistsByCodeAsync(string code);
    Task<Tenant> CreateAsync(Tenant tenant);
    Task UpdateAsync(Tenant tenant);
    Task<MasterUser?> GetUserByEmailOrPhoneAsync(string term);
    Task<MasterUser?> GetUserByPinAsync(string pin);
    Task<MasterUser?> GetOwnerByTenantIdAsync(Guid tenantId);
    Task<MasterUser> CreateUserAsync(MasterUser user, Guid tenantId, string role);
    Task<string> GetUserRoleAsync(Guid userId, Guid tenantId);
    Task<bool> ToggleActiveAsync(Guid id);
}
