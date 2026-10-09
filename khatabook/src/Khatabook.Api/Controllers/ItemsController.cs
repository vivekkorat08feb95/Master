using Microsoft.AspNetCore.Mvc;
using Khatabook.Api.DTOs;
using Khatabook.Api.Services;

namespace Khatabook.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ItemsController : ControllerBase
{
    private readonly IInventoryService _inventoryService;

    public ItemsController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? category, [FromQuery] bool? isActive = true)
    {
        var list = await _inventoryService.GetItemsAsync(search, category, isActive);
        return Ok(list);
    }

    [HttpGet("low-stock")]
    public async Task<IActionResult> GetLowStock()
    {
        var list = await _inventoryService.GetLowStockItemsAsync();
        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _inventoryService.GetItemDetailsAsync(id);
        if (result == null) return NotFound("Item not found.");
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateItemRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest("Item name is required.");

        var item = await _inventoryService.CreateItemAsync(req);
        return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateItemRequest req)
    {
        var item = await _inventoryService.UpdateItemAsync(id, req);
        if (item == null) return NotFound("Item not found.");
        return Ok(item);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var ok = await _inventoryService.SoftDeleteItemAsync(id);
        if (!ok) return NotFound("Item not found.");
        return Ok(new { message = "Item deactivated successfully (soft-deleted).", id });
    }

    [HttpPatch("{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(Guid id)
    {
        var activeState = await _inventoryService.ToggleItemActiveAsync(id);
        return Ok(new { id, isActive = activeState, message = activeState ? "Item reactivated." : "Item deactivated." });
    }
}
