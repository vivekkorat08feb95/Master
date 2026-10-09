using LinqToDB.Mapping;

namespace Khatabook.Api.Domain;

[Table("user_tenants")]
public class UserTenant : IEntity, ISoftDeletable
{
    [PrimaryKey, Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("user_id"), NotNull]
    public Guid UserId { get; set; }

    [Column("tenant_id"), NotNull]
    public Guid TenantId { get; set; }

    [Column("role"), NotNull]
    public string Role { get; set; } = "Owner";

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
