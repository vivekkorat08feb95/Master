using LinqToDB.Mapping;

namespace Khatabook.Api.Domain;

[Table("audit_logs")]
public class AuditLog : IEntity
{
    [PrimaryKey, Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("correlation_id"), NotNull]
    public string CorrelationId { get; set; } = string.Empty;

    [Column("timestamp"), NotNull]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [Column("tenant_id")]
    public Guid? TenantId { get; set; }

    [Column("tenant_code")]
    public string? TenantCode { get; set; }

    [Column("user_id")]
    public Guid? UserId { get; set; }

    [Column("user_name")]
    public string? UserName { get; set; }

    [Column("user_role")]
    public string? UserRole { get; set; }

    [Column("http_method"), NotNull]
    public string HttpMethod { get; set; } = string.Empty;

    [Column("endpoint"), NotNull]
    public string Endpoint { get; set; } = string.Empty;

    [Column("query_string")]
    public string? QueryString { get; set; }

    [Column("status_code"), NotNull]
    public int StatusCode { get; set; }

    [Column("duration_ms"), NotNull]
    public decimal DurationMs { get; set; }

    [Column("client_ip"), NotNull]
    public string ClientIp { get; set; } = string.Empty;

    [Column("device_type"), NotNull]
    public string DeviceType { get; set; } = "UNKNOWN";

    [Column("platform_os")]
    public string? PlatformOs { get; set; }

    [Column("browser")]
    public string? Browser { get; set; }

    [Column("user_agent")]
    public string? UserAgent { get; set; }

    [Column("request_payload")]
    public string? RequestPayload { get; set; }

    [Column("response_payload")]
    public string? ResponsePayload { get; set; }

    [Column("error_message")]
    public string? ErrorMessage { get; set; }
}
