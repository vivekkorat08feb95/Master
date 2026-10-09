using LinqToDB;
using LinqToDB.Async;
using Microsoft.AspNetCore.Mvc;
using Khatabook.Api.Domain;
using Khatabook.Api.DTOs;
using Khatabook.Api.Infrastructure.Data;

namespace Khatabook.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly MasterDataConnection _db;

    public UsersController(MasterDataConnection db)
    {
        _db = db;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] CreateUserRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest("Name is required.");

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);

        var user = new MasterUser
        {
            Id = Guid.NewGuid(),
            Name = req.Name.Trim(),
            Email = req.Email?.Trim().ToLowerInvariant(),
            Phone = req.Phone?.Trim(),
            PasswordHash = passwordHash,
            PinCode = req.PinCode?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _db.InsertAsync(user);

        if (req.TenantId.HasValue && req.TenantId.Value != Guid.Empty)
        {
            await _db.InsertAsync(new UserTenant
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TenantId = req.TenantId.Value,
                Role = string.IsNullOrWhiteSpace(req.Role) ? "Owner" : req.Role,
                CreatedAt = DateTime.UtcNow
            });
        }

        return Ok(new
        {
            user.Id,
            user.Name,
            user.Email,
            user.Phone
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        MasterUser? user = null;

        if (!string.IsNullOrWhiteSpace(req.EmailOrPhone))
        {
            var term = req.EmailOrPhone.Trim().ToLowerInvariant();
            user = await _db.Users.FirstOrDefaultAsync(u => u.Email == term || u.Phone == term);
        }
        else if (!string.IsNullOrWhiteSpace(req.PinCode))
        {
            user = await _db.Users.FirstOrDefaultAsync(u => u.PinCode == req.PinCode.Trim());
        }

        if (user == null)
        {
            return Unauthorized("Invalid credentials or user not found.");
        }

        if (!string.IsNullOrWhiteSpace(req.Password))
        {
            bool valid = BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash);
            if (!valid) return Unauthorized("Invalid password.");
        }

        var tenantList = await (
            from ut in _db.UserTenants
            join t in _db.Tenants on ut.TenantId equals t.Id
            where ut.UserId == user.Id
            select new
            {
                t.Id,
                t.Code,
                t.Name,
                t.BusinessType,
                ut.Role
            }
        ).ToListAsync();

        return Ok(new
        {
            User = new
            {
                user.Id,
                user.Name,
                user.Email,
                user.Phone
            },
            Tenants = tenantList
        });
    }
}
