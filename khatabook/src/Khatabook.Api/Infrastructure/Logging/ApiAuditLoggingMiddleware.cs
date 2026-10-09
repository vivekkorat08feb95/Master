using System.Diagnostics;
using System.Security.Claims;
using System.Text;
using LinqToDB;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using Khatabook.Api.Domain;
using Khatabook.Api.Infrastructure.Context;
using Khatabook.Api.Infrastructure.Data;

namespace Khatabook.Api.Infrastructure.Logging;

public class ApiAuditLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IServiceScopeFactory _scopeFactory;

    public const string CorrelationIdHeader = "X-Correlation-Id";

    public ApiAuditLoggingMiddleware(RequestDelegate next, IServiceScopeFactory scopeFactory)
    {
        _next = next;
        _scopeFactory = scopeFactory;
    }

    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext)
    {
        var path = context.Request.Path.Value ?? "";

        // Skip non-API and static assets to prevent log bloat
        if (ShouldSkipLogging(path))
        {
            await _next(context);
            return;
        }

        // 1. Correlation ID
        var correlationId = context.Request.Headers[CorrelationIdHeader].ToString();
        if (string.IsNullOrWhiteSpace(correlationId))
        {
            correlationId = Guid.NewGuid().ToString("N");
        }
        context.Response.Headers[CorrelationIdHeader] = correlationId;

        // 2. Client Device & IP Resolution
        var deviceInfo = DeviceDetector.ResolveDeviceInfo(context);

        // 3. Read Request Payload
        context.Request.EnableBuffering();
        string rawRequestBody = string.Empty;
        if (context.Request.ContentLength > 0 && context.Request.Body.CanRead)
        {
            using var reader = new StreamReader(context.Request.Body, Encoding.UTF8, leaveOpen: true);
            rawRequestBody = await reader.ReadToEndAsync();
            context.Request.Body.Position = 0; // Rewind for model binding
        }

        // 4. Swap Response Stream to Intercept Output Payload
        var originalBodyStream = context.Response.Body;
        using var responseBodyStream = new MemoryStream();
        context.Response.Body = responseBodyStream;

        var stopwatch = Stopwatch.StartNew();
        Exception? caughtException = null;

        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            caughtException = ex;
            throw;
        }
        finally
        {
            stopwatch.Stop();
            var durationMs = (decimal)stopwatch.Elapsed.TotalMilliseconds;

            // Read intercepted response
            responseBodyStream.Position = 0;
            string rawResponseBody = await new StreamReader(responseBodyStream, Encoding.UTF8).ReadToEndAsync();
            responseBodyStream.Position = 0;
            await responseBodyStream.CopyToAsync(originalBodyStream);
            context.Response.Body = originalBodyStream;

            // Sanitize payloads
            var sanitizedRequest = PayloadSanitizer.Sanitize(rawRequestBody);
            var sanitizedResponse = PayloadSanitizer.Sanitize(rawResponseBody);

            // Extract User Identity if present
            var userId = tenantContext.UserId;
            var tenantId = tenantContext.TenantId;
            var tenantCode = tenantContext.TenantCode;
            var userName = context.User?.FindFirst(ClaimTypes.Name)?.Value 
                        ?? context.User?.FindFirst("name")?.Value 
                        ?? context.Request.Headers["X-User-Name"].ToString();
            var userRole = context.User?.FindFirst(ClaimTypes.Role)?.Value 
                        ?? context.User?.FindFirst("role")?.Value 
                        ?? context.Request.Headers["X-User-Role"].ToString();

            int statusCode = context.Response.StatusCode;
            string httpMethod = context.Request.Method;
            string endpoint = context.Request.Path.Value ?? "";
            string queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : "";

            // 5. Emit to Serilog (Console + Rolling JSON File)
            Log.ForContext("CorrelationId", correlationId)
               .ForContext("TenantCode", tenantCode ?? "N/A")
               .ForContext("TenantId", tenantId)
               .ForContext("UserId", userId)
               .ForContext("UserName", userName)
               .ForContext("UserRole", userRole)
               .ForContext("DeviceType", deviceInfo.DeviceType)
               .ForContext("PlatformOs", deviceInfo.PlatformOs)
               .ForContext("Browser", deviceInfo.Browser)
               .ForContext("ClientIp", deviceInfo.ClientIp)
               .ForContext("DurationMs", durationMs)
               .ForContext("RequestPayload", sanitizedRequest)
               .ForContext("ResponsePayload", sanitizedResponse)
               .Information(
                   "API {HttpMethod} {Endpoint} responded {StatusCode} in {DurationMs:0.0}ms | Tenant: {TenantCode} | Device: {DeviceType} ({PlatformOs}, {Browser}) | IP: {ClientIp}",
                   httpMethod, endpoint, statusCode, durationMs, tenantCode ?? "public", deviceInfo.DeviceType, deviceInfo.PlatformOs, deviceInfo.Browser, deviceInfo.ClientIp);

            // 6. Asynchronously Persist to Master Database (Fire-and-forget, zero response delay)
            _ = PersistAuditLogAsync(
                correlationId,
                tenantId,
                tenantCode,
                userId,
                userName,
                userRole,
                httpMethod,
                endpoint,
                queryString,
                statusCode,
                durationMs,
                deviceInfo,
                sanitizedRequest,
                sanitizedResponse,
                caughtException?.Message);
        }
    }

    private static bool ShouldSkipLogging(string path)
    {
        var p = path.ToLowerInvariant();
        return p.StartsWith("/swagger") ||
               p.EndsWith(".js") ||
               p.EndsWith(".css") ||
               p.EndsWith(".ico") ||
               p.EndsWith(".png") ||
               p.EndsWith(".jpg") ||
               p.EndsWith(".svg") ||
               p == "/favicon.ico" ||
               p == "/health";
    }

    private async Task PersistAuditLogAsync(
        string correlationId,
        Guid? tenantId,
        string? tenantCode,
        Guid? userId,
        string? userName,
        string? userRole,
        string httpMethod,
        string endpoint,
        string? queryString,
        int statusCode,
        decimal durationMs,
        DeviceInfo deviceInfo,
        string requestPayload,
        string responsePayload,
        string? errorMessage)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var masterDb = scope.ServiceProvider.GetRequiredService<MasterDataConnection>();

            var entry = new AuditLog
            {
                Id = Guid.NewGuid(),
                CorrelationId = correlationId,
                Timestamp = DateTime.UtcNow,
                TenantId = tenantId,
                TenantCode = tenantCode,
                UserId = userId,
                UserName = string.IsNullOrWhiteSpace(userName) ? null : userName,
                UserRole = string.IsNullOrWhiteSpace(userRole) ? null : userRole,
                HttpMethod = httpMethod,
                Endpoint = endpoint,
                QueryString = string.IsNullOrWhiteSpace(queryString) ? null : queryString,
                StatusCode = statusCode,
                DurationMs = Math.Round(durationMs, 2),
                ClientIp = deviceInfo.ClientIp,
                DeviceType = deviceInfo.DeviceType,
                PlatformOs = deviceInfo.PlatformOs,
                Browser = deviceInfo.Browser,
                UserAgent = deviceInfo.UserAgent,
                RequestPayload = string.IsNullOrWhiteSpace(requestPayload) ? null : requestPayload,
                ResponsePayload = string.IsNullOrWhiteSpace(responsePayload) ? null : responsePayload,
                ErrorMessage = errorMessage
            };

            await masterDb.InsertAsync(entry);
        }
        catch (Exception ex)
        {
            Log.Warning("Failed to persist audit log into Master DB: {Error}", ex.Message);
        }
    }
}
