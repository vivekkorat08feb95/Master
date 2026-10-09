using Khatabook.Api.Domain;
using Khatabook.Api.Infrastructure.Data;
using Khatabook.Api.Repositories;

namespace Khatabook.Api.Services;

public class AuthService : IAuthService
{
    private readonly ITenantRepository _tenantRepo;
    private readonly ITenantDatabaseService _tenantDbService;

    public AuthService(ITenantRepository tenantRepo, ITenantDatabaseService tenantDbService)
    {
        _tenantRepo = tenantRepo;
        _tenantDbService = tenantDbService;
    }

    public async Task<object> RegisterStoreAsync(Controllers.RegisterStoreRequest req)
    {
        var cleanCode = req.StoreCode.Trim().ToLowerInvariant().Replace(" ", "_");

        var exists = await _tenantRepo.ExistsByCodeAsync(cleanCode);
        if (exists)
        {
            throw new InvalidOperationException($"Store code '{cleanCode}' is already taken.");
        }

        var tenant = await _tenantDbService.ProvisionNewTenantDatabaseAsync(
            cleanCode,
            req.StoreName.Trim(),
            string.IsNullOrWhiteSpace(req.BusinessType) ? "Kirana" : req.BusinessType.Trim(),
            req.Phone,
            req.Email,
            req.Address,
            req.Gstin,
            "₹"
        );

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);
        var owner = new MasterUser
        {
            Id = Guid.NewGuid(),
            Name = string.IsNullOrWhiteSpace(req.OwnerName) ? req.StoreName : req.OwnerName.Trim(),
            Email = req.Email?.Trim().ToLowerInvariant(),
            Phone = req.Phone?.Trim(),
            PasswordHash = passwordHash,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _tenantRepo.CreateUserAsync(owner, tenant.Id, "Owner");

        return new
        {
            Message = "Store and dedicated database registered successfully!",
            Tenant = tenant,
            User = new
            {
                owner.Id,
                owner.Name,
                owner.Email,
                owner.Phone,
                Role = "Owner"
            }
        };
    }

    public async Task<object> LoginAsync(Controllers.StoreLoginRequest req)
    {
        var term = req.StoreCodeOrEmail?.Trim().ToLowerInvariant() ?? "";

        var tenant = await _tenantRepo.GetByCodeAsync(term);
        MasterUser? user = null;

        if (tenant != null)
        {
            user = await _tenantRepo.GetOwnerByTenantIdAsync(tenant.Id);
        }
        else
        {
            user = await _tenantRepo.GetUserByEmailOrPhoneAsync(term);
            if (user != null)
            {
                var tenants = await _tenantRepo.GetAllActiveAsync();
                tenant = tenants.FirstOrDefault();
            }
        }

        if (user == null || tenant == null)
        {
            throw new UnauthorizedAccessException("Account not found. Please check your credentials.");
        }

        bool valid = BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash);
        if (!valid)
        {
            throw new UnauthorizedAccessException("Invalid password.");
        }

        var role = await _tenantRepo.GetUserRoleAsync(user.Id, tenant.Id);

        // Generate single active session token & record login device
        var sessionToken = Guid.NewGuid().ToString("N");
        tenant.CurrentSessionToken = sessionToken;
        tenant.LastLoginDevice = string.IsNullOrWhiteSpace(req.DeviceInfo) ? "Web / Desktop" : req.DeviceInfo.Trim();
        tenant.LastLoginAt = DateTime.UtcNow;
        tenant.UpdatedAt = DateTime.UtcNow;
        await _tenantRepo.UpdateAsync(tenant);

        return new
        {
            Message = "Login successful",
            Tenant = tenant,
            User = new
            {
                user.Id,
                user.Name,
                user.Email,
                user.Phone,
                Role = role
            },
            SessionToken = sessionToken
        };
    }

    public async Task<object> ValidateSessionAsync(string storeCode, string? sessionToken)
    {
        if (string.IsNullOrWhiteSpace(storeCode))
        {
            return new { Valid = false, Enforced = false, Message = "Store code required" };
        }

        var tenant = await _tenantRepo.GetByCodeAsync(storeCode.Trim().ToLowerInvariant());
        if (tenant == null)
        {
            return new { Valid = false, Enforced = false, Message = "Store not found" };
        }

        if (!tenant.EnforceSingleSession)
        {
            return new 
            { 
                Valid = true, 
                Enforced = false, 
                Device = tenant.LastLoginDevice,
                LastLoginAt = tenant.LastLoginAt 
            };
        }

        // Single session policy IS enforced:
        bool matches = !string.IsNullOrEmpty(tenant.CurrentSessionToken) && 
                       !string.IsNullOrEmpty(sessionToken) && 
                       string.Equals(tenant.CurrentSessionToken, sessionToken, StringComparison.Ordinal);

        if (!matches)
        {
            var deviceLabel = tenant.LastLoginDevice ?? "another device";
            return new
            {
                Valid = false,
                Enforced = true,
                Message = $"Your account was logged in from {deviceLabel}. Single device policy has ended this session.",
                CurrentDevice = tenant.LastLoginDevice,
                LastLoginAt = tenant.LastLoginAt
            };
        }

        return new
        {
            Valid = true,
            Enforced = true,
            Device = tenant.LastLoginDevice,
            LastLoginAt = tenant.LastLoginAt
        };
    }
}
