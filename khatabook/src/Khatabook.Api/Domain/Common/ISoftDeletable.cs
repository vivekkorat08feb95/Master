namespace Khatabook.Api.Domain;

public interface ISoftDeletable
{
    bool IsActive { get; set; }
}
