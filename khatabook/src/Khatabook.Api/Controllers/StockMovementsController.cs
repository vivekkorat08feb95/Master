using Microsoft.AspNetCore.Mvc;
using Khatabook.Api.DTOs;
using Khatabook.Api.Services;

namespace Khatabook.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StockMovementsController : ControllerBase
{
    private readonly IInventoryService _inventoryService;

    public StockMovementsController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpPost("adjust")]
    public async Task<IActionResult> AdjustStock([FromBody] StockAdjustmentRequest req)
    {
        if (req.Quantity <= 0)
            return BadRequest("Adjustment quantity must be greater than zero.");

        var adjType = req.AdjustmentType.Trim().ToUpperInvariant();
        if (adjType != "ADD" && adjType != "SUBTRACT")
            return BadRequest("AdjustmentType must be 'ADD' or 'SUBTRACT'.");

        try
        {
            var result = await _inventoryService.AdjustStockAsync(req);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpPost("audit-reconcile")]
    public async Task<IActionResult> ReconcileStockAudit([FromBody] StockAuditReconcileRequest req)
    {
        if (req.PhysicalCount < 0)
            return BadRequest("Physical count cannot be negative.");

        if (string.IsNullOrWhiteSpace(req.DiscrepancyReason))
            return BadRequest("DiscrepancyReason is required.");

        try
        {
            var result = await _inventoryService.ReconcileStockAuditAsync(req);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpGet("daily-register")]
    public async Task<IActionResult> GetDailyStockRegister([FromQuery] DateTime? date)
    {
        var register = await _inventoryService.GetDailyStockRegisterAsync(date);
        return Ok(register);
    }

    [HttpGet("history/{itemId}")]
    public async Task<IActionResult> GetHistory(Guid itemId)
    {
        var history = await _inventoryService.GetItemStockHistoryAsync(itemId);
        return Ok(history);
    }
}
