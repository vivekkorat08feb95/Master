using LinqToDB;
using Khatabook.Api.Domain;

namespace Khatabook.Api.Repositories;

public interface IGenericRepository<T> where T : class, IEntity
{
    ITable<T> Query();
    Task<List<T>> GetAllAsync();
    Task<T?> GetByIdAsync(Guid id);
    Task<T> InsertAsync(T entity);
    Task InsertRangeAsync(IEnumerable<T> entities);
    Task UpdateAsync(T entity);
    Task DeleteAsync(Guid id);
    Task<bool> ToggleActiveAsync(Guid id);
    Task SetActiveStatusAsync(Guid id, bool isActive);
}
