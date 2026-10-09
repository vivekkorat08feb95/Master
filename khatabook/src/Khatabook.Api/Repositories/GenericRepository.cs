using LinqToDB;
using LinqToDB.Async;
using Khatabook.Api.Domain;
using Khatabook.Api.Infrastructure.Data;

namespace Khatabook.Api.Repositories;

public class GenericRepository<T> : IGenericRepository<T> where T : class, IEntity
{
    protected readonly TenantDataConnection Db;

    public GenericRepository(TenantDataConnection db)
    {
        Db = db;
    }

    public ITable<T> Query() => Db.GetTable<T>();

    public virtual async Task<List<T>> GetAllAsync()
    {
        return await Db.GetTable<T>().ToListAsync();
    }

    public virtual async Task<T?> GetByIdAsync(Guid id)
    {
        return await Db.GetTable<T>().FirstOrDefaultAsync(e => e.Id == id);
    }

    public virtual async Task<T> InsertAsync(T entity)
    {
        await Db.InsertAsync(entity);
        return entity;
    }

    public virtual async Task InsertRangeAsync(IEnumerable<T> entities)
    {
        foreach (var entity in entities)
        {
            await Db.InsertAsync(entity);
        }
    }

    public virtual async Task UpdateAsync(T entity)
    {
        await Db.UpdateAsync(entity);
    }

    public virtual async Task DeleteAsync(Guid id)
    {
        var entity = await GetByIdAsync(id);
        if (entity != null)
        {
            if (entity is ISoftDeletable softDeletable)
            {
                softDeletable.IsActive = false;
                SetUpdatedAtIfExists(entity);
                await Db.UpdateAsync(entity);
            }
            else
            {
                await Db.DeleteAsync(entity);
            }
        }
    }

    public virtual async Task<bool> ToggleActiveAsync(Guid id)
    {
        var entity = await GetByIdAsync(id);
        if (entity == null) return false;

        if (entity is ISoftDeletable softDeletable)
        {
            softDeletable.IsActive = !softDeletable.IsActive;
            SetUpdatedAtIfExists(entity);
            await Db.UpdateAsync(entity);
            return softDeletable.IsActive;
        }

        return true;
    }

    public virtual async Task SetActiveStatusAsync(Guid id, bool isActive)
    {
        var entity = await GetByIdAsync(id);
        if (entity != null && entity is ISoftDeletable softDeletable)
        {
            softDeletable.IsActive = isActive;
            SetUpdatedAtIfExists(entity);
            await Db.UpdateAsync(entity);
        }
    }

    private static void SetUpdatedAtIfExists(T entity)
    {
        var prop = entity.GetType().GetProperty("UpdatedAt");
        if (prop != null && prop.CanWrite && prop.PropertyType == typeof(DateTime))
        {
            prop.SetValue(entity, DateTime.UtcNow);
        }
    }
}
