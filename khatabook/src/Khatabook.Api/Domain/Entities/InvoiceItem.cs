using LinqToDB.Mapping;

namespace Khatabook.Api.Domain;

[Table("invoice_items")]
public class InvoiceItem : IEntity
{
    [PrimaryKey, Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("invoice_id"), NotNull]
    public Guid InvoiceId { get; set; }

    [Column("item_id")]
    public Guid? ItemId { get; set; }

    [Column("item_name"), NotNull]
    public string ItemName { get; set; } = string.Empty;

    [Column("native_name")]
    public string? NativeName { get; set; }

    [Column("unit")]
    public string Unit { get; set; } = "Pcs";

    [Column("hsn_code")]
    public string? HsnCode { get; set; }

    [Column("price_tier")]
    public string PriceTier { get; set; } = "RETAIL";

    [Column("batch_number")]
    public string? BatchNumber { get; set; }

    [Column("expiry_date")]
    public DateTime? ExpiryDate { get; set; }

    [Column("quantity"), NotNull]
    public decimal Quantity { get; set; }

    [Column("unit_price"), NotNull]
    public decimal UnitPrice { get; set; }

    [Column("discount_amount")]
    public decimal DiscountAmount { get; set; } = 0.00m;

    [Column("tax_rate")]
    public decimal TaxRate { get; set; } = 0.00m;

    [Column("tax_amount")]
    public decimal TaxAmount { get; set; } = 0.00m;

    [Column("total"), NotNull]
    public decimal Total { get; set; }
}
