using Microsoft.AspNetCore.Http;
using System.Text.RegularExpressions;

namespace Khatabook.Api.Infrastructure.Logging;

public class DeviceInfo
{
    public string DeviceType { get; set; } = "UNKNOWN"; // DESKTOP, MOBILE_IOS, MOBILE_ANDROID, TABLET, BOT, UNKNOWN
    public string PlatformOs { get; set; } = "Unknown OS";
    public string Browser { get; set; } = "Unknown Browser";
    public string ClientIp { get; set; } = "127.0.0.1";
    public string UserAgent { get; set; } = string.Empty;
}

public static class DeviceDetector
{
    public static DeviceInfo ResolveDeviceInfo(HttpContext context)
    {
        var info = new DeviceInfo();

        // 1. Resolve Client IP
        info.ClientIp = ResolveClientIp(context);

        // 2. Read User-Agent and custom client headers
        var userAgent = context.Request.Headers.UserAgent.ToString();
        var clientDeviceHeader = context.Request.Headers["X-Client-Device"].ToString();
        info.UserAgent = userAgent;

        if (string.IsNullOrWhiteSpace(userAgent) && string.IsNullOrWhiteSpace(clientDeviceHeader))
        {
            info.DeviceType = "API_CLIENT";
            info.PlatformOs = "Direct API Call";
            info.Browser = "HTTP Client";
            return info;
        }

        var ua = userAgent.ToLowerInvariant();

        // If client passed explicit client device header (e.g. from React frontend)
        if (!string.IsNullOrWhiteSpace(clientDeviceHeader))
        {
            var headerLower = clientDeviceHeader.ToLowerInvariant();
            if (headerLower.Contains("ios") || headerLower.Contains("iphone") || headerLower.Contains("ipad"))
            {
                info.DeviceType = headerLower.Contains("ipad") || headerLower.Contains("tablet") ? "TABLET" : "MOBILE_IOS";
            }
            else if (headerLower.Contains("android"))
            {
                info.DeviceType = headerLower.Contains("tablet") ? "TABLET" : "MOBILE_ANDROID";
            }
            else if (headerLower.Contains("tablet"))
            {
                info.DeviceType = "TABLET";
            }
            else if (headerLower.Contains("desktop") || headerLower.Contains("windows") || headerLower.Contains("mac") || headerLower.Contains("linux"))
            {
                info.DeviceType = "DESKTOP";
            }
        }

        // 3. Detect Device Type if not yet resolved
        if (info.DeviceType == "UNKNOWN")
        {
            if (ua.Contains("ipad") || ua.Contains("tablet") || (ua.Contains("android") && !ua.Contains("mobile")))
            {
                info.DeviceType = "TABLET";
            }
            else if (ua.Contains("iphone") || ua.Contains("ipod"))
            {
                info.DeviceType = "MOBILE_IOS";
            }
            else if (ua.Contains("android") && ua.Contains("mobile"))
            {
                info.DeviceType = "MOBILE_ANDROID";
            }
            else if (ua.Contains("mobile"))
            {
                info.DeviceType = "MOBILE";
            }
            else if (ua.Contains("windows") || ua.Contains("macintosh") || ua.Contains("linux") || ua.Contains("x11"))
            {
                info.DeviceType = "DESKTOP";
            }
            else if (ua.Contains("bot") || ua.Contains("crawl") || ua.Contains("spider"))
            {
                info.DeviceType = "BOT";
            }
            else
            {
                info.DeviceType = "DESKTOP";
            }
        }

        // 4. Detect Platform OS
        if (ua.Contains("windows nt 10.0")) info.PlatformOs = "Windows 10/11";
        else if (ua.Contains("windows")) info.PlatformOs = "Windows";
        else if (ua.Contains("iphone os") || ua.Contains("ipad") || ua.Contains("ios")) info.PlatformOs = ExtractIosVersion(userAgent);
        else if (ua.Contains("android")) info.PlatformOs = ExtractAndroidVersion(userAgent);
        else if (ua.Contains("macintosh") || ua.Contains("mac os x")) info.PlatformOs = "macOS";
        else if (ua.Contains("linux")) info.PlatformOs = "Linux";
        else info.PlatformOs = "Unknown OS";

        // 5. Detect Browser
        if (ua.Contains("edg/")) info.Browser = "Microsoft Edge";
        else if (ua.Contains("chrome/") && !ua.Contains("edg/")) info.Browser = "Google Chrome";
        else if (ua.Contains("safari/") && !ua.Contains("chrome/")) info.Browser = "Apple Safari";
        else if (ua.Contains("firefox/")) info.Browser = "Mozilla Firefox";
        else if (ua.Contains("opr/") || ua.Contains("opera")) info.Browser = "Opera";
        else if (ua.Contains("postman")) info.Browser = "Postman";
        else if (ua.Contains("curl")) info.Browser = "cURL";
        else info.Browser = "Web Client";

        return info;
    }

    private static string ResolveClientIp(HttpContext context)
    {
        // 1. Check CF-Connecting-IP (Cloudflare)
        var cfIp = context.Request.Headers["CF-Connecting-IP"].ToString();
        if (!string.IsNullOrWhiteSpace(cfIp)) return cfIp.Trim();

        // 2. Check X-Forwarded-For (Proxies, Load balancers)
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].ToString();
        if (!string.IsNullOrWhiteSpace(forwardedFor))
        {
            var firstIp = forwardedFor.Split(',', StringSplitOptions.RemoveEmptyEntries)[0].Trim();
            if (!string.IsNullOrWhiteSpace(firstIp)) return firstIp;
        }

        // 3. Check X-Real-IP
        var realIp = context.Request.Headers["X-Real-IP"].ToString();
        if (!string.IsNullOrWhiteSpace(realIp)) return realIp.Trim();

        // 4. Remote IP Address fallback
        var remoteIp = context.Connection.RemoteIpAddress?.ToString();
        if (!string.IsNullOrWhiteSpace(remoteIp))
        {
            if (remoteIp == "::1") return "127.0.0.1 (Localhost)";
            return remoteIp;
        }

        return "127.0.0.1";
    }

    private static string ExtractAndroidVersion(string ua)
    {
        var match = Regex.Match(ua, @"Android\s+([0-9\.]+)", RegexOptions.IgnoreCase);
        return match.Success ? $"Android {match.Groups[1].Value}" : "Android";
    }

    private static string ExtractIosVersion(string ua)
    {
        var match = Regex.Match(ua, @"OS\s+([0-9_]+)", RegexOptions.IgnoreCase);
        return match.Success ? $"iOS {match.Groups[1].Value.Replace('_', '.')}" : "iOS";
    }
}
