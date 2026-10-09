using LinqToDB.Mapping;

namespace Khatabook.Api.Domain;

[Table("items")]
public class Item : IEntity, ISoftDeletable
{
    [PrimaryKey, Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("name"), NotNull]
    public string Name { get; set; } = string.Empty;

    [Column("native_name")]
    public string? NativeName { get; set; }

    [Column("barcode")]
    public string? Barcode { get; set; }

    [Column("sku")]
    public string? Sku { get; set; }

    [Column("category")]
    public string Category { get; set; } = "General";

    [Column("unit")]
    public string Unit { get; set; } = "Pcs"; // 'Pcs', 'Kg', 'Bag', 'Strip', 'Box', 'Ltr', 'Service'

    [Column("purchase_price")]
    public decimal PurchasePrice { get; set; } = 0.00m;

    [Column("selling_price")]
    public decimal SellingPrice { get; set; } = 0.00m;

    [Column("wholesale_price")]
    public decimal WholesalePrice { get; set; } = 0.00m;

    [Column("secondary_unit")]
    public string? SecondaryUnit { get; set; }

    [Column("unit_conversion_ratio")]
    public decimal UnitConversionRatio { get; set; } = 1.0000m;

    [Column("mrp")]
    public decimal Mrp { get; set; } = 0.00m;

    [Column("tax_rate")]
    public decimal TaxRate { get; set; } = 0.00m;

    [Column("hsn_code")]
    public string? HsnCode { get; set; }

    // Specialized fields for Agro, Pharmacy, Garage, Electronics
    [Column("batch_number")]
    public string? BatchNumber { get; set; }

    [Column("expiry_date")]
    public DateTime? ExpiryDate { get; set; }

    [Column("mfg_date")]
    public DateTime? MfgDate { get; set; }

    [Column("serial_imei")]
    public string? SerialImei { get; set; }

    [Column("part_number")]
    public string? PartNumber { get; set; }

    [Column("current_stock")]
    public decimal CurrentStock { get; set; } = 0.000m;

    [Column("min_stock_alert")]
    public decimal MinStockAlert { get; set; } = 5.000m;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
