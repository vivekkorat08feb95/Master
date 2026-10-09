using LinqToDB.Mapping;

namespace Khatabook.Api.Domain;

[Table("stock_movements")]
public class StockMovement : IEntity
{
    [PrimaryKey, Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("item_id"), NotNull]
    public Guid ItemId { get; set; }

    [Column("movement_type"), NotNull]
    public string MovementType { get; set; } = string.Empty;

    [Column("quantity"), NotNull]
    public decimal Quantity { get; set; }

    [Column("unit_price")]
    public decimal UnitPrice { get; set; } = 0.00m;

    [Column("stock_after"), NotNull]
    public decimal StockAfter { get; set; }

    [Column("reference_id")]
    public Guid? ReferenceId { get; set; }

    [Column("reason")]
    public string? Reason { get; set; }

    [Column("batch_number")]
    public string? BatchNumber { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_by")]
    public Guid? CreatedBy { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
