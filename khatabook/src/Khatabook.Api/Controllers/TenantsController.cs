using Microsoft.AspNetCore.Mvc;
using Khatabook.Api.DTOs;
using Khatabook.Api.Infrastructure.Data;
using Khatabook.Api.Repositories;

namespace Khatabook.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TenantsController : ControllerBase
{
    private readonly ITenantRepository _tenantRepo;
    private readonly ITenantDatabaseService _tenantDbService;

    public TenantsController(ITenantRepository tenantRepo, ITenantDatabaseService tenantDbService)
    {
        _tenantRepo = tenantRepo;
        _tenantDbService = tenantDbService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tenants = await _tenantRepo.GetAllActiveAsync();
        return Ok(tenants);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var tenant = await _tenantRepo.GetByIdAsync(id);
        if (tenant == null) return NotFound("Tenant / Store not found.");
        return Ok(tenant);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTenantRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest("Store name is required.");

        if (string.IsNullOrWhiteSpace(req.Code))
            return BadRequest("Store unique code (e.g. 'agro1', 'agro2') is required.");

        var cleanCode = req.Code.Trim().ToLowerInvariant().Replace(" ", "_");

        var exists = await _tenantRepo.ExistsByCodeAsync(cleanCode);
        if (exists)
        {
            return BadRequest($"Store with code '{cleanCode}' already exists. Please choose a different code.");
        }

        var tenant = await _tenantDbService.ProvisionNewTenantDatabaseAsync(
            cleanCode,
            req.Name,
            req.BusinessType ?? "Kirana",
            req.Phone,
            req.Email,
            req.Address,
            req.Gstin,
            req.CurrencySymbol
        );

        return CreatedAtAction(nameof(GetById), new { id = tenant.Id }, tenant);
    }

    [HttpGet("{code}/branding")]
    public async Task<IActionResult> GetBranding(string code)
    {
        var tenant = await _tenantRepo.GetByCodeAsync(code);
        if (tenant == null) return NotFound("Store not found.");
        return Ok(tenant);
    }

    [HttpPut("{code}/branding")]
    public async Task<IActionResult> UpdateBranding(string code, [FromBody] UpdateTenantBrandingRequest req)
    {
        var tenant = await _tenantRepo.GetByCodeAsync(code);
        if (tenant == null) return NotFound("Store not found.");

        if (req.LogoUrl != null) tenant.LogoUrl = req.LogoUrl;
        if (req.Tagline != null) tenant.Tagline = req.Tagline;
        if (req.Gstin != null) tenant.Gstin = req.Gstin;
        if (req.Address != null) tenant.Address = req.Address;
        if (req.Phone != null) tenant.Phone = req.Phone;
        if (req.PrintHeaderNote != null) tenant.PrintHeaderNote = req.PrintHeaderNote;
        if (req.PrintFooterNote != null) tenant.PrintFooterNote = req.PrintFooterNote;
        if (req.UpiId != null) tenant.UpiId = req.UpiId;
        if (req.UpiPayeeName != null) tenant.UpiPayeeName = req.UpiPayeeName;
        if (req.EnforceSingleSession.HasValue) tenant.EnforceSingleSession = req.EnforceSingleSession.Value;

        tenant.UpdatedAt = DateTime.UtcNow;
        await _tenantRepo.UpdateAsync(tenant);

        return Ok(tenant);
    }

    [HttpPatch("{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(Guid id)
    {
        var tenant = await _tenantRepo.GetByIdAsync(id);
        if (tenant == null) return NotFound("Tenant / Store not found.");

        var activeState = await _tenantRepo.ToggleActiveAsync(id);
        return Ok(new { id, isActive = activeState, message = activeState ? "Store reactivated." : "Store deactivated." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var tenant = await _tenantRepo.GetByIdAsync(id);
        if (tenant == null) return NotFound("Tenant / Store not found.");

        tenant.IsActive = false;
        tenant.UpdatedAt = DateTime.UtcNow;
        await _tenantRepo.UpdateAsync(tenant);

        return Ok(new { message = "Store deactivated successfully (soft-deleted).", id });
    }
}
