namespace Khatabook.Api.Infrastructure.Context;

public interface ITenantContext
{
    Guid? TenantId { get; set; }
    string? TenantCode { get; set; }
    Guid? UserId { get; set; }
    bool HasTenant => (TenantId.HasValue && TenantId.Value != Guid.Empty) || !string.IsNullOrWhiteSpace(TenantCode);
}

public class TenantContext : ITenantContext
{
    public Guid? TenantId { get; set; }
    public string? TenantCode { get; set; }
    public Guid? UserId { get; set; }
}

public class TenantMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantMiddleware> _logger;

    public const string TenantIdHeaderName = "X-Tenant-Id";
    public const string TenantCodeHeaderName = "X-Tenant-Code";
    public const string UserHeaderName = "X-User-Id";
    public const string SessionTokenHeaderName = "X-Session-Token";

    public TenantMiddleware(RequestDelegate next, ILogger<TenantMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext, Khatabook.Api.Repositories.ITenantRepository tenantRepo)
    {
        // 1. Resolve Tenant ID or Code from Headers
        if (context.Request.Headers.TryGetValue(TenantIdHeaderName, out var tenantHeader) &&
            Guid.TryParse(tenantHeader, out var tenantId))
        {
            tenantContext.TenantId = tenantId;
        }

        if (context.Request.Headers.TryGetValue(TenantCodeHeaderName, out var codeHeader))
        {
            tenantContext.TenantCode = codeHeader.ToString();
        }

        // Query param fallbacks
        if (context.Request.Query.TryGetValue("tenantCode", out var codeFromQuery))
        {
            tenantContext.TenantCode = codeFromQuery.ToString();
        }

        // 2. Resolve User ID
        if (context.Request.Headers.TryGetValue(UserHeaderName, out var userHeader) &&
            Guid.TryParse(userHeader, out var userId))
        {
            tenantContext.UserId = userId;
        }

        // 3. Single Device / Session Enforcement (if enabled for this store)
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";
        bool isAuthOrDocPath = path.StartsWith("/api/auth") || 
                               path.StartsWith("/swagger") || 
                               path.StartsWith("/api/admin") ||
                               context.Request.Method == "OPTIONS";

        if (!isAuthOrDocPath && tenantContext.HasTenant)
        {
            Khatabook.Api.Domain.Tenant? tenant = null;
            if (tenantContext.TenantId.HasValue && tenantContext.TenantId.Value != Guid.Empty)
            {
                tenant = await tenantRepo.GetByIdAsync(tenantContext.TenantId.Value);
            }
            else if (!string.IsNullOrWhiteSpace(tenantContext.TenantCode))
            {
                tenant = await tenantRepo.GetByCodeAsync(tenantContext.TenantCode);
            }

            if (tenant != null && tenant.EnforceSingleSession)
            {
                context.Request.Headers.TryGetValue(SessionTokenHeaderName, out var providedToken);
                var tokenStr = providedToken.ToString();

                bool isMatch = !string.IsNullOrEmpty(tenant.CurrentSessionToken) && 
                               !string.IsNullOrEmpty(tokenStr) && 
                               string.Equals(tenant.CurrentSessionToken, tokenStr, StringComparison.Ordinal);

                if (!isMatch)
                {
                    _logger.LogWarning("Single-session violation for tenant {TenantCode}. Current device: {Device}", tenant.Code, tenant.LastLoginDevice);
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new
                    {
                        message = $"Your account was logged in from another device ({tenant.LastLoginDevice ?? "another device"}). Session ended by Single Device Policy."
                    });
                    return;
                }
            }
        }

        await _next(context);
    }
}
