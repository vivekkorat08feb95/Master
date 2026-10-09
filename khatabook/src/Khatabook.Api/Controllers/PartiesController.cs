using Microsoft.AspNetCore.Mvc;
using Khatabook.Api.DTOs;
using Khatabook.Api.Services;

namespace Khatabook.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PartiesController : ControllerBase
{
    private readonly IPartyService _partyService;

    public PartiesController(IPartyService partyService)
    {
        _partyService = partyService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? type, [FromQuery] string? search, [FromQuery] bool? isActive = true)
    {
        var list = await _partyService.GetPartiesAsync(type, search, isActive);
        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _partyService.GetPartyDetailsAsync(id);
        if (result == null) return NotFound("Party not found.");
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePartyRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest("Party name is required.");

        var party = await _partyService.CreatePartyAsync(req);
        return CreatedAtAction(nameof(GetById), new { id = party.Id }, party);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreatePartyRequest req)
    {
        var party = await _partyService.UpdatePartyAsync(id, req);
        if (party == null) return NotFound("Party not found.");
        return Ok(party);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ok = await _partyService.SoftDeletePartyAsync(id);
        if (!ok) return NotFound("Party not found.");
        return Ok(new { message = "Party deactivated successfully (soft-deleted).", id });
    }

    [HttpPatch("{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(Guid id)
    {
        var activeState = await _partyService.TogglePartyActiveAsync(id);
        return Ok(new { id, isActive = activeState, message = activeState ? "Party reactivated." : "Party deactivated." });
    }

    [HttpPost("{id}/settle-udhaar")]
    public async Task<IActionResult> SettleUdhaar(Guid id, [FromBody] SettleUdhaarRequest req)
    {
        try
        {
            var result = await _partyService.SettleUdhaarAsync(id, req);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Party not found.");
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
