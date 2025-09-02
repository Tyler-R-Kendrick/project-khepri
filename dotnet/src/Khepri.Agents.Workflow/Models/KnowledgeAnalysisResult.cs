namespace Khepri.Khepri.Agents.Workflow.Models;

/// <summary>
/// Represents the results of knowledge analysis.
/// </summary>
public record KnowledgeAnalysisResult
{
    /// <summary>
    /// Gets the extracted knowledge assets.
    /// </summary>
    public required IReadOnlyCollection<string> KnowledgeAssets { get; init; }

    /// <summary>
    /// Gets the identified documentation gaps.
    /// </summary>
    public required IReadOnlyCollection<string> DocumentationGaps { get; init; }

    /// <summary>
    /// Gets the LSIF data generated.
    /// </summary>
    public string? LsifData { get; init; }

    /// <summary>
    /// Gets the behavior specifications created.
    /// </summary>
    public IReadOnlyCollection<string> BehaviorSpecs { get; init; } = Array.Empty<string>();
}
