namespace Khepri.Khepri.Agents.Workflow.Models;

/// <summary>
/// Represents implementation results.
/// </summary>
public record ImplementationResult
{
    /// <summary>
    /// Gets the test results from TDD cycles.
    /// </summary>
    public required IReadOnlyCollection<string> TestResults { get; init; }

    /// <summary>
    /// Gets the generated code artifacts.
    /// </summary>
    public required IReadOnlyCollection<string> CodeArtifacts { get; init; }

    /// <summary>
    /// Gets the regression test suite.
    /// </summary>
    public IReadOnlyCollection<string> RegressionTests { get; init; } = Array.Empty<string>();

    /// <summary>
    /// Gets the implementation status.
    /// </summary>
    public required string Status { get; init; }

    /// <summary>
    /// Gets any implementation notes.
    /// </summary>
    public string? Notes { get; init; }
}
