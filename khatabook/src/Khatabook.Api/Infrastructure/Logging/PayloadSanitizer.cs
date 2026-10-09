using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Khatabook.Api.Infrastructure.Logging;

public static class PayloadSanitizer
{
    private static readonly HashSet<string> SensitiveKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "password",
        "passwordhash",
        "confirmpassword",
        "token",
        "refreshtoken",
        "secret",
        "authorization",
        "pin",
        "upipin",
        "cvv",
        "apikey"
    };

    private const int MaxPayloadLength = 32768; // 32 KB threshold

    public static string Sanitize(string? rawJson)
    {
        if (string.IsNullOrWhiteSpace(rawJson))
        {
            return string.Empty;
        }

        var trimmed = rawJson.Trim();

        // If not JSON, return truncated if necessary
        if (!trimmed.StartsWith("{") && !trimmed.StartsWith("["))
        {
            return TruncateIfNeeded(trimmed);
        }

        try
        {
            var node = JsonNode.Parse(trimmed);
            if (node == null)
            {
                return TruncateIfNeeded(trimmed);
            }

            MaskSensitiveNodes(node);
            var sanitized = node.ToJsonString();
            return TruncateIfNeeded(sanitized);
        }
        catch
        {
            // Regex fallback if JSON parsing fails on partial/malformed inputs
            var masked = Regex.Replace(
                trimmed,
                @"(""(" + string.Join("|", SensitiveKeys) + @")""\s*:\s*"")[^""]*("")",
                "$1***MASKED***$3",
                RegexOptions.IgnoreCase);

            return TruncateIfNeeded(masked);
        }
    }

    private static void MaskSensitiveNodes(JsonNode node)
    {
        if (node is JsonObject obj)
        {
            var propertiesToMask = new List<string>();

            foreach (var property in obj)
            {
                if (SensitiveKeys.Contains(property.Key))
                {
                    propertiesToMask.Add(property.Key);
                }
                else if (property.Value != null)
                {
                    MaskSensitiveNodes(property.Value);
                }
            }

            foreach (var key in propertiesToMask)
            {
                obj[key] = "***MASKED***";
            }
        }
        else if (node is JsonArray array)
        {
            foreach (var item in array)
            {
                if (item != null)
                {
                    MaskSensitiveNodes(item);
                }
            }
        }
    }

    private static string TruncateIfNeeded(string content)
    {
        if (content.Length <= MaxPayloadLength)
        {
            return content;
        }

        return content[..MaxPayloadLength] + $"... [TRUNCATED {content.Length - MaxPayloadLength} bytes]";
    }
}
