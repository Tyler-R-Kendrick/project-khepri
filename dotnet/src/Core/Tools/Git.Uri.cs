using System.Text.RegularExpressions;
namespace Khepri.Core.Tools;

public static partial class Git
{
    public sealed partial record Uri(
        UriScheme Scheme,
        string? User,
        string? Host,
        string Owner,
        string Repository)
    {
        private const string ScpPattern
            = @"^(?<user>[^@]+)@(?<host>[^:]+):(?<owner>[^/]+)/(?<repo>.+?)(?:\.git)?$";
        [GeneratedRegex(ScpPattern, RegexOptions.IgnoreCase | RegexOptions.Compiled, "")]
        private static partial Regex Scp();

        public static Uri Parse(string raw) => TryParse(raw, out var result)
            ? result! : throw new FormatException($"'{raw}' is not a recognised Git URI.");

        public static bool TryParse(string raw, out Uri? gitUri)
        {
            gitUri = null;
            if (string.IsNullOrWhiteSpace(raw)) return false;

            /* 1️⃣  Standard URI forms (https://, ssh://, git://, file://) */
            if (System.Uri.TryCreate(raw, UriKind.Absolute, out var uri) &&
                (uri.Scheme is "https" or "http" or "ssh" or "git" or "file"))
            {
                // file:// may have no host component
                var path = uri.AbsolutePath.Trim('/');
                var parts = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length < 2) return false;

                var repo = parts[^1].EndsWith(".git", StringComparison.OrdinalIgnoreCase)
                    ? parts[^1][..^4] : parts[^1];

                if (TryParseUriScheme(uri.Scheme, out var scheme))
                {
                    gitUri = new Uri(
                        Scheme: scheme,
                        User: uri.UserInfo.Split(':').FirstOrDefault()?.NullIfEmpty(),
                        Host: uri.Host.NullIfEmpty(),
                        Owner: parts[0],
                        Repository: repo);

                    return true;
                }
            }

            /* 2️⃣  SCP-style SSH form: git@host:owner/repo(.git) */
            var m = Scp().Match(raw);
            if (m.Success)
            {
                var groups = m.Groups;
                string ValueOf(string name) => groups[name].Value;
                gitUri = new Uri(
                    Scheme: UriScheme.SSH,
                    User: ValueOf("user"),
                    Host: ValueOf("host"),
                    Owner: ValueOf("owner"),
                    Repository: ValueOf("repo"));

                return true;
            }

            return false;
        }

        public override string ToString() => Scheme switch
        {
            UriScheme.SSH when User is not null =>
                $"{User}@{Host}:{Owner}/{Repository}.git",
            UriScheme.File when Host is null =>
                $"{Scheme}://{Owner}/{Repository}.git",
            _ => $"{Scheme}://{Host}/{Owner}/{Repository}.git"
        };
    }
}
