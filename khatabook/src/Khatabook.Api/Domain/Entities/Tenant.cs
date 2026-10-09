using LinqToDB.Mapping;

namespace Khatabook.Api.Domain;

[Table("tenants")]
public class Tenant : IEntity, ISoftDeletable
{
    [PrimaryKey, Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("code"), NotNull]
    public string Code { get; set; } = string.Empty; // e.g. 'agro1', 'agro2', 'kirana1', 'garage1'

    [Column("name"), NotNull]
    public string Name { get; set; } = string.Empty;

    [Column("business_type"), NotNull]
    public string BusinessType { get; set; } = "Kirana"; // 'Kirana', 'Agro', 'Pharmacy', 'Garage', 'Electronics', 'General'

    [Column("database_name"), NotNull]
    public string DatabaseName { get; set; } = string.Empty; // e.g. 'khatabook_tenant_agro1'

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("email")]
    public string? Email { get; set; }

    [Column("address")]
    public string? Address { get; set; }

    [Column("gstin")]
    public string? Gstin { get; set; }

    [Column("currency_symbol")]
    public string CurrencySymbol { get; set; } = "₹";

    [Column("logo_url")]
    public string? LogoUrl { get; set; }

    [Column("tagline")]
    public string? Tagline { get; set; }

    [Column("print_header_note")]
    public string? PrintHeaderNote { get; set; }

    [Column("print_footer_note")]
    public string? PrintFooterNote { get; set; }

    [Column("upi_id")]
    public string? UpiId { get; set; }

    [Column("upi_payee_name")]
    public string? UpiPayeeName { get; set; }

    [Column("enforce_single_session")]
    public bool EnforceSingleSession { get; set; } = false;

    [Column("current_session_token")]
    public string? CurrentSessionToken { get; set; }

    [Column("last_login_device")]
    public string? LastLoginDevice { get; set; }

    [Column("last_login_at")]
    public DateTime? LastLoginAt { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
