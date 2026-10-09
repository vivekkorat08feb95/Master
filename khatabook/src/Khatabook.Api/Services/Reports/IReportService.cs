using Khatabook.Api.Domain;

namespace Khatabook.Api.Services;

public interface IReportService
{
    Task<object> GetDashboardStatsAsync();
    Task<object> GetDaybookAsync(DateTime? date);
    Task<object> GetStockValuationAsync();
    Task<List<Party>> GetOutstandingAsync(string? type);
    Task<object> GetGstr1ReportAsync(DateTime fromDate, DateTime toDate);
}
