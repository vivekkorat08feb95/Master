namespace Khatabook.Api.DTOs;

public record CreateTenantRequest(
    string Code, // e.g. 'agro1', 'agro2', 'kirana1', 'garage1'
    string Name,
    string BusinessType, // 'Kirana', 'Agro', 'Pharmacy', 'Garage', 'Electronics', 'General'
    string? Phone,
    string? Email,
    string? Address,
    string? Gstin,
    string? CurrencySymbol
);

public record UpdateTenantBrandingRequest(
    string? LogoUrl,
    string? Tagline,
    string? Gstin,
    string? Address,
    string? Phone,
    string? PrintHeaderNote,
    string? PrintFooterNote,
    string? UpiId,
    string? UpiPayeeName,
    bool? EnforceSingleSession
);
