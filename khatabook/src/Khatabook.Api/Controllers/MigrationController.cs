using Microsoft.AspNetCore.Mvc;
using Khatabook.Api.DTOs;
using Khatabook.Api.Services;

namespace Khatabook.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MigrationController : ControllerBase
{
    private readonly IMigrationService _migrationService;

    public MigrationController(IMigrationService migrationService)
    {
        _migrationService = migrationService;
    }

    [HttpPost("import-parties")]
    public async Task<IActionResult> ImportParties([FromBody] BulkImportPartiesRequest req)
    {
        if (req.Parties == null || !req.Parties.Any())
            return BadRequest("No customer or supplier records provided for import.");

        var result = await _migrationService.ImportPartiesAsync(req);
        return Ok(result);
    }

    [HttpPost("import-items")]
    public async Task<IActionResult> ImportItems([FromBody] BulkImportItemsRequest req)
    {
        if (req.Items == null || !req.Items.Any())
            return BadRequest("No inventory item records provided for import.");

        var result = await _migrationService.ImportItemsAsync(req);
        return Ok(result);
    }

    [HttpPost("import-invoices")]
    public async Task<IActionResult> ImportInvoices([FromBody] BulkImportInvoicesRequest req)
    {
        if (req.Invoices == null || !req.Invoices.Any())
            return BadRequest("No historical invoices provided for import.");

        var result = await _migrationService.ImportInvoicesAsync(req);
        return Ok(result);
    }

    [HttpGet("template/{type}")]
    public IActionResult GetTemplate(string type)
    {
        switch (type.ToLowerInvariant())
        {
            case "parties":
                return Ok(new List<ImportPartyItem>
                {
                    new("Ramesh Patel", "रमेश पटेल", "9876543210", "Market Yard, Shop 12", "CUSTOMER", 15000.00m, DateTime.UtcNow.AddMonths(-3), null, null),
                    new("Kisan Agro Agency", "किसान एग्रो एजेंसी", "9822334455", "MIDC Area", "SUPPLIER", -25000.00m, DateTime.UtcNow.AddMonths(-2), null, null)
                });
            case "items":
                return Ok(new List<ImportInventoryItem>
                {
                    new("Wheat Sharbati 50kg", "गेहूं शरबती ५० किग्रा", "890123456789", "Grains", "Bag", 1800.00m, 2100.00m, 2200.00m, 0.00m, "1001", "BATCH-2026-A", DateTime.UtcNow.AddYears(1), 50.0m, 10.0m),
                    new("Urea Fertilizer 45kg", "यूरिया खाद ४५ किग्रा", "890987654321", "Fertilizers", "Bag", 266.50m, 300.00m, 310.00m, 5.00m, "3102", "UREA-AUG-26", DateTime.UtcNow.AddYears(2), 120.0m, 20.0m)
                });
            case "invoices":
                return Ok(new List<ImportInvoiceItem>
                {
                    new("INV-OLD-001", "SALE", "Ramesh Patel", "9876543210", DateTime.UtcNow.AddDays(-15), 5200.00m, 4000.00m, "CASH", "Old invoice import", "Admin", new List<InvoiceItemDto>
                    {
                        new(null, "Wheat Sharbati 50kg", "Bag", "BATCH-2026-A", null, 2, 2100.00m, 0, 0, "गेहूं शरबती ५० किग्रा")
                    })
                });
            default:
                return BadRequest("Unknown template type. Supported types: parties, items, invoices.");
        }
    }
}
