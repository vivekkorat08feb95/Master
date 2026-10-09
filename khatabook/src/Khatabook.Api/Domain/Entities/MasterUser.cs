using LinqToDB.Mapping;

namespace Khatabook.Api.Domain;

[Table("master_users")]
public class MasterUser : IEntity, ISoftDeletable
{
    [PrimaryKey, Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("name"), NotNull]
    public string Name { get; set; } = string.Empty;

    [Column("email")]
    public string? Email { get; set; }

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("password_hash"), NotNull]
    public string PasswordHash { get; set; } = string.Empty;

    [Column("pin_code")]
    public string? PinCode { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
