using Microsoft.AspNetCore.Mvc;
using Khatabook.Api.Services;

namespace Khatabook.Api.Controllers;

public record RegisterStoreRequest(
    string StoreCode,
    string StoreName,
    string BusinessType,
    string OwnerName,
    string? Email,
    string? Phone,
    string Password,
    string? Address,
    string? Gstin
);

public record StoreLoginRequest(
    string? StoreCodeOrEmail,
    string Password,
    string? DeviceInfo = null
);

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register-store")]
    public async Task<IActionResult> RegisterStore([FromBody] RegisterStoreRequest req)
    {
        try
        {
            var result = await _authService.RegisterStoreAsync(req);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] StoreLoginRequest req)
    {
        try
        {
            var result = await _authService.LoginAsync(req);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ex.Message);
        }
    }

    [HttpGet("validate-session")]
    public async Task<IActionResult> ValidateSession([FromQuery] string storeCode, [FromQuery] string? sessionToken)
    {
        var result = await _authService.ValidateSessionAsync(storeCode, sessionToken);
        return Ok(result);
    }
}
