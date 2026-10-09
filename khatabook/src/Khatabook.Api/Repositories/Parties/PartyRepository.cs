using LinqToDB;
using LinqToDB.Async;
using Khatabook.Api.Domain;
using Khatabook.Api.Infrastructure.Data;

namespace Khatabook.Api.Repositories;

public class PartyRepository : GenericRepository<Party>, IPartyRepository
{
    public PartyRepository(TenantDataConnection db) : base(db) { }

    public async Task<List<Party>> GetAllAsync(string? type, string? search, bool? isActive = true)
    {
        var query = Db.Parties.AsQueryable();

        if (isActive.HasValue)
        {
            query = query.Where(p => p.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(type))
        {
            var upperType = type.Trim().ToUpperInvariant();
            query = query.Where(p => p.PartyType == upperType);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            query = query.Where(p => 
                Sql.Like(p.Name, term) || 
                (p.NativeName != null && Sql.Like(p.NativeName, term)) || 
                (p.Phone != null && Sql.Like(p.Phone, term)) || 
                (p.VehicleNumber != null && Sql.Like(p.VehicleNumber, term))
            );
        }

        return await query.OrderByDescending(p => p.UpdatedAt).ToListAsync();
    }

    public async Task<Party> CreateAsync(Party party)
    {
        return await InsertAsync(party);
    }
}
