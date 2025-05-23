namespace Khepri.Core.Tools;

public static partial class Git
{
    public static UriScheme ParseUriScheme(string scheme) => scheme.ToLowerInvariant() switch
    {
        "file" => UriScheme.File,
        "git" => UriScheme.GIT,
        "http" => UriScheme.HTTP,
        "https" => UriScheme.HTTPS,
        "ssh" => UriScheme.SSH,
        _ => throw new ArgumentException($"Unknown URI scheme: {scheme}")
    };

    public static bool TryParseUriScheme(string scheme, out UriScheme uriScheme)
    {
        try
        {
            uriScheme = ParseUriScheme(scheme);
            return true;
        }
        catch (ArgumentException)
        {
            uriScheme = default;
            return false;
        }
    }

    public static string GetUriScheme(UriScheme scheme) => scheme switch
    {
        UriScheme.File
            or UriScheme.GIT
            or UriScheme.HTTP
            or UriScheme.HTTPS
            or UriScheme.SSH
            => scheme.ToString().ToLowerInvariant(),
        _ => throw new ArgumentException($"Unknown URI scheme: {scheme}"),
    };
}
