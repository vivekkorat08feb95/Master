using Microsoft.AspNetCore.Mvc;
using Khatabook.Api.DTOs;
using Khatabook.Api.Services;

namespace Khatabook.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InvoicesController : ControllerBase
{
    private readonly IBillingService _billingService;

    public InvoicesController(IBillingService billingService)
    {
        _billingService = billingService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? type,
        [FromQuery] Guid? partyId,
        [FromQuery] Guid? createdBy,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] bool? isActive = true)
    {
        var list = await _billingService.GetInvoicesAsync(type, partyId, createdBy, search, page, pageSize, isActive);
        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _billingService.GetInvoiceDetailsAsync(id);
        if (result == null) return NotFound("Invoice not found.");
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInvoiceRequest req)
    {
        if (req.Items == null || !req.Items.Any())
            return BadRequest("At least one invoice item is required.");

        var invoiceType = string.IsNullOrWhiteSpace(req.InvoiceType) ? "SALE" : req.InvoiceType.Trim().ToUpperInvariant();
        if (invoiceType != "SALE" && invoiceType != "PURCHASE")
            return BadRequest("InvoiceType must be 'SALE' or 'PURCHASE'.");

        var result = await _billingService.CreateInvoiceAsync(req);
        return Ok(result);
    }

    [HttpPost("return")]
    public async Task<IActionResult> ProcessReturn([FromBody] CreateInvoiceReturnRequest req)
    {
        if (req.Items == null || !req.Items.Any())
            return BadRequest("At least one return item is required.");

        try
        {
            var result = await _billingService.ProcessInvoiceReturnAsync(req);
            return Ok(result);
        }
        catch (KeyNotFoundException knf)
        {
            return NotFound(knf.Message);
        }
        catch (InvalidOperationException inv)
        {
            return BadRequest(inv.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.Message);
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ok = await _billingService.SoftDeleteInvoiceAsync(id);
        if (!ok) return NotFound("Invoice not found.");
        return Ok(new { message = "Invoice deactivated / voided successfully (soft-deleted).", id });
    }

    [HttpPatch("{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(Guid id)
    {
        var activeState = await _billingService.ToggleInvoiceActiveAsync(id);
        return Ok(new { id, isActive = activeState, message = activeState ? "Invoice reactivated." : "Invoice voided / deactivated." });
    }
}
