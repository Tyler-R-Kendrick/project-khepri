using System.ComponentModel;
using Google.Protobuf;

namespace Khepri.Code2NL.SourceGraph;
using Core.Tools;

public interface ISourceGraphPlugin
{
    [Description("Generate an SCIP snapshot of the source code in the specified language and URI.")]
    Scip.Index GenerateSnapshot(
        [Description("The language of the source code.")]
        string language,
        [Description("The URI of the source code.")]
        Git.Uri uri);

    [Description("Get the SCIP indexer for the specified language.")]
    MessageParser<Scip.Index> GetOrCreateIndexer(
        [Description("The language of the source code.")]
        string language);
}