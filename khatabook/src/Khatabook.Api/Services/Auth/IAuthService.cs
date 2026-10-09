namespace Khatabook.Api.Services;

public interface IAuthService
{
    Task<object> RegisterStoreAsync(Controllers.RegisterStoreRequest req);
    Task<object> LoginAsync(Controllers.StoreLoginRequest req);
    Task<object> ValidateSessionAsync(string storeCode, string? sessionToken);
}
