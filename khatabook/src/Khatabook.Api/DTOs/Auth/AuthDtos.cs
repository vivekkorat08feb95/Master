namespace Khatabook.Api.DTOs;

public record CreateUserRequest(
    string Name,
    string? Email,
    string? Phone,
    string Password,
    string? PinCode,
    Guid? TenantId,
    string? Role
);

public record LoginRequest(
    string? EmailOrPhone,
    string? Password,
    string? PinCode
);
