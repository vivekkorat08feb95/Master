using Khatabook.Api.Domain;

namespace Khatabook.Api.Repositories;

public interface IPartyRepository : IGenericRepository<Party>
{
    Task<List<Party>> GetAllAsync(string? type, string? search, bool? isActive = true);
    Task<Party> CreateAsync(Party party);
}
