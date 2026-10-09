using LinqToDB.Mapping;

namespace Khatabook.Api.Domain;

[Table("invoices")]
public class Invoice : IEntity, ISoftDeletable
{
    [PrimaryKey, Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("invoice_number"), NotNull]
    public string InvoiceNumber { get; set; } = string.Empty;

    [Column("invoice_type"), NotNull]
    public string InvoiceType { get; set; } = "SALE";

    [Column("party_id")]
    public Guid? PartyId { get; set; }

    [Column("party_name")]
    public string? PartyName { get; set; }

    [Column("party_phone")]
    public string? PartyPhone { get; set; }

    // Specialized retail billing fields
    [Column("vehicle_number")]
    public string? VehicleNumber { get; set; } // Garage

    [Column("doctor_name")]
    public string? DoctorName { get; set; } // Pharmacy

    [Column("patient_name")]
    public string? PatientName { get; set; } // Pharmacy

    [Column("subtotal")]
    public decimal Subtotal { get; set; } = 0.00m;

    [Column("discount_amount")]
    public decimal DiscountAmount { get; set; } = 0.00m;

    [Column("tax_amount")]
    public decimal TaxAmount { get; set; } = 0.00m;

    [Column("total_amount")]
    public decimal TotalAmount { get; set; } = 0.00m;

    [Column("paid_amount")]
    public decimal PaidAmount { get; set; } = 0.00m;

    [Column("payment_status")]
    public string PaymentStatus { get; set; } = "PAID";

    [Column("payment_mode")]
    public string PaymentMode { get; set; } = "CASH";

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("invoice_date")]
    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;

    [Column("created_by")]
    public Guid? CreatedBy { get; set; }

    [Column("created_by_name")]
    public string? CreatedByName { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
