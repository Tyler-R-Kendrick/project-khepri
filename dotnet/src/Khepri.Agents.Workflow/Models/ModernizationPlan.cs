namespace Khepri.Khepri.Agents.Workflow.Models;

/// <summary>
/// Represents a modernization plan.
/// </summary>
public record ModernizationPlan
{
    /// <summary>
    /// Gets the migration strategy.
    /// </summary>
    public required string MigrationStrategy { get; init; }

    /// <summary>
    /// Gets the dependency analysis results.
    /// </summary>
    public required IReadOnlyCollection<string> Dependencies { get; init; }

    /// <summary>
    /// Gets the identified architectural changes.
    /// </summary>
    public required IReadOnlyCollection<string> ArchitecturalChanges { get; init; }

    /// <summary>
    /// Gets the test strategy for TDD implementation.
    /// </summary>
    public required string TestStrategy { get; init; }

    /// <summary>
    /// Gets the implementation steps.
    /// </summary>
    public required IReadOnlyCollection<string> ImplementationSteps { get; init; }

    /// <summary>
    /// Gets the estimated effort.
    /// </summary>
    public string? EstimatedEffort { get; init; }

    /// <summary>
    /// Gets the risk assessment.
    /// </summary>
    public IReadOnlyCollection<string> Risks { get; init; } = Array.Empty<string>();
}
