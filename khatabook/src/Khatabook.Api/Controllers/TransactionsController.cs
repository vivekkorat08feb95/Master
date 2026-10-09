using Microsoft.AspNetCore.Mvc;
using Khatabook.Api.DTOs;
using Khatabook.Api.Services;

namespace Khatabook.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransactionsController : ControllerBase
{
    private readonly IPartyService _partyService;

    public TransactionsController(IPartyService partyService)
    {
        _partyService = partyService;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTransactionRequest req)
    {
        if (req.Amount <= 0)
            return BadRequest("Amount must be greater than zero.");

        var txnType = req.TxnType.Trim().ToUpperInvariant();
        if (txnType != "DEBIT" && txnType != "CREDIT")
            return BadRequest("TxnType must be 'DEBIT' (You Gave) or 'CREDIT' (You Got).");

        try
        {
            var result = await _partyService.RecordTransactionAsync(req);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpGet("party/{partyId}")]
    public async Task<IActionResult> GetByParty(Guid partyId, [FromQuery] bool? isActive = true)
    {
        var list = await _partyService.GetPartyTransactionsAsync(partyId, isActive);
        return Ok(list);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ok = await _partyService.SoftDeleteTransactionAsync(id);
        if (!ok) return NotFound("Transaction not found or already deactivated.");
        return Ok(new { message = "Transaction deactivated successfully (soft-deleted). Ledger balance recalculated.", id });
    }

    [HttpPatch("{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(Guid id)
    {
        var activeState = await _partyService.ToggleTransactionActiveAsync(id);
        return Ok(new { id, isActive = activeState, message = activeState ? "Transaction reactivated." : "Transaction deactivated." });
    }
}
