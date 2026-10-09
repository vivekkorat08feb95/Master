using LinqToDB;
using LinqToDB.Async;
using Khatabook.Api.Domain;
using Khatabook.Api.Infrastructure.Data;

namespace Khatabook.Api.Repositories;

public class TenantRepository : ITenantRepository
{
    private readonly MasterDataConnection _masterDb;

    public TenantRepository(MasterDataConnection masterDb)
    {
        _masterDb = masterDb;
    }

    public async Task<List<Tenant>> GetAllActiveAsync()
    {
        return await _masterDb.Tenants.Where(t => t.IsActive).OrderByDescending(t => t.CreatedAt).ToListAsync();
    }

    public async Task<Tenant?> GetByIdAsync(Guid id)
    {
        return (await _masterDb.Tenants.Where(t => t.Id == id).ToListAsync()).FirstOrDefault();
    }

    public async Task<Tenant?> GetByCodeAsync(string code)
    {
        var cleanCode = code.Trim().ToLowerInvariant();
        return (await _masterDb.Tenants.Where(t => t.Code == cleanCode && t.IsActive).ToListAsync()).FirstOrDefault();
    }

    public async Task<bool> ExistsByCodeAsync(string code)
    {
        var cleanCode = code.Trim().ToLowerInvariant();
        return await _masterDb.Tenants.AnyAsync(t => t.Code == cleanCode);
    }

    public async Task<Tenant> CreateAsync(Tenant tenant)
    {
        await _masterDb.InsertAsync(tenant);
        return tenant;
    }

    public async Task UpdateAsync(Tenant tenant)
    {
        await _masterDb.UpdateAsync(tenant);
    }

    public async Task<MasterUser?> GetUserByEmailOrPhoneAsync(string term)
    {
        var cleanTerm = term.Trim().ToLowerInvariant();
        return (await _masterDb.Users.Where(u => u.Email == cleanTerm || u.Phone == cleanTerm).ToListAsync()).FirstOrDefault();
    }

    public async Task<MasterUser?> GetUserByPinAsync(string pin)
    {
        var cleanPin = pin.Trim();
        return (await _masterDb.Users.Where(u => u.PinCode == cleanPin).ToListAsync()).FirstOrDefault();
    }

    public async Task<MasterUser?> GetOwnerByTenantIdAsync(Guid tenantId)
    {
        var query = from ut in _masterDb.UserTenants
                    join u in _masterDb.Users on ut.UserId equals u.Id
                    where ut.TenantId == tenantId
                    select u;

        return (await query.ToListAsync()).FirstOrDefault();
    }

    public async Task<MasterUser> CreateUserAsync(MasterUser user, Guid tenantId, string role)
    {
        await _masterDb.InsertAsync(user);
        await _masterDb.InsertAsync(new UserTenant
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TenantId = tenantId,
            Role = role,
            CreatedAt = DateTime.UtcNow
        });
        return user;
    }

    public async Task<string> GetUserRoleAsync(Guid userId, Guid tenantId)
    {
        var ut = (await _masterDb.UserTenants
            .Where(x => x.UserId == userId && x.TenantId == tenantId)
            .ToListAsync()).FirstOrDefault();
        return ut?.Role ?? "Owner";
    }

    public async Task<bool> ToggleActiveAsync(Guid id)
    {
        var tenant = await GetByIdAsync(id);
        if (tenant == null) return false;
        tenant.IsActive = !tenant.IsActive;
        tenant.UpdatedAt = DateTime.UtcNow;
        await _masterDb.UpdateAsync(tenant);
        return tenant.IsActive;
    }
}
