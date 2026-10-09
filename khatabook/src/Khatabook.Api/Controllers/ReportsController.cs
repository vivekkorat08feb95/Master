using Microsoft.AspNetCore.Mvc;
using Khatabook.Api.Services;

namespace Khatabook.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var result = await _reportService.GetDashboardStatsAsync();
        return Ok(result);
    }

    [HttpGet("daybook")]
    public async Task<IActionResult> GetDaybook([FromQuery] DateTime? date)
    {
        var result = await _reportService.GetDaybookAsync(date);
        return Ok(result);
    }

    [HttpGet("stock-valuation")]
    public async Task<IActionResult> GetStockValuation()
    {
        var result = await _reportService.GetStockValuationAsync();
        return Ok(result);
    }

    [HttpGet("outstanding")]
    public async Task<IActionResult> GetOutstanding([FromQuery] string? type)
    {
        var list = await _reportService.GetOutstandingAsync(type);
        return Ok(list);
    }

    [HttpGet("gstr1")]
    public async Task<IActionResult> GetGstr1([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var from = fromDate ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var to = toDate ?? DateTime.UtcNow;
        var result = await _reportService.GetGstr1ReportAsync(from, to);
        return Ok(result);
    }
}
