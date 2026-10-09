using LinqToDB.Mapping;

namespace Khatabook.Api.Domain;

[Table("transactions")]
public class Transaction : IEntity, ISoftDeletable
{
    [PrimaryKey, Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("party_id"), NotNull]
    public Guid PartyId { get; set; }

    [Column("invoice_id")]
    public Guid? InvoiceId { get; set; }

    [Column("txn_type"), NotNull]
    public string TxnType { get; set; } = "DEBIT";

    [Column("amount"), NotNull]
    public decimal Amount { get; set; }

    [Column("payment_mode")]
    public string PaymentMode { get; set; } = "CASH";

    [Column("description")]
    public string? Description { get; set; }

    [Column("txn_date")]
    public DateTime TxnDate { get; set; } = DateTime.UtcNow;

    [Column("created_by")]
    public Guid? CreatedBy { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
