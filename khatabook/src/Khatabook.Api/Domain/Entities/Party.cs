using LinqToDB.Mapping;

namespace Khatabook.Api.Domain;

[Table("parties")]
public class Party : IEntity, ISoftDeletable
{
    [PrimaryKey, Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("name"), NotNull]
    public string Name { get; set; } = string.Empty;

    [Column("native_name")]
    public string? NativeName { get; set; }

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("email")]
    public string? Email { get; set; }

    [Column("address")]
    public string? Address { get; set; }

    [Column("gstin")]
    public string? Gstin { get; set; }

    [Column("state")]
    public string? State { get; set; } = "Gujarat";

    [Column("state_code")]
    public string? StateCode { get; set; } = "24";

    [Column("party_type"), NotNull]
    public string PartyType { get; set; } = "CUSTOMER"; // 'CUSTOMER' or 'SUPPLIER'

    // Specialized retail fields
    [Column("vehicle_number")]
    public string? VehicleNumber { get; set; } // For Garage

    [Column("dl_number")]
    public string? DlNumber { get; set; } // For Pharmacy

    [Column("opening_balance")]
    public decimal OpeningBalance { get; set; } = 0.00m;

    [Column("current_balance")]
    public decimal CurrentBalance { get; set; } = 0.00m;

    [Column("credit_limit")]
    public decimal CreditLimit { get; set; } = 0.00m;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
