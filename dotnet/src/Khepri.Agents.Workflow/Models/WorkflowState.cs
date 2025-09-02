namespace Khepri.Khepri.Agents.Workflow.Models;

/// <summary>
/// Represents the state of a modernization workflow.
/// </summary>
public record WorkflowState
{
    /// <summary>
    /// Gets the unique workflow identifier.
    /// </summary>
    public required string WorkflowId { get; init; }

    /// <summary>
    /// Gets the current phase of the workflow.
    /// </summary>
    public required WorkflowPhase Phase { get; init; }

    /// <summary>
    /// Gets the project path being modernized.
    /// </summary>
    public required string ProjectPath { get; init; }

    /// <summary>
    /// Gets the modernization goals.
    /// </summary>
    public required IReadOnlyCollection<string> Goals { get; init; }

    /// <summary>
    /// Gets the target framework.
    /// </summary>
    public string? TargetFramework { get; init; }

    /// <summary>
    /// Gets the knowledge analysis results.
    /// </summary>
    public KnowledgeAnalysisResult? KnowledgeAnalysis { get; init; }

    /// <summary>
    /// Gets the modernization plan.
    /// </summary>
    public ModernizationPlan? Plan { get; init; }

    /// <summary>
    /// Gets the user approval status.
    /// </summary>
    public UserApprovalStatus? ApprovalStatus { get; init; }

    /// <summary>
    /// Gets the implementation results.
    /// </summary>
    public ImplementationResult? Implementation { get; init; }

    /// <summary>
    /// Gets the workflow start time.
    /// </summary>
    public DateTimeOffset StartTime { get; init; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Gets the workflow completion time.
    /// </summary>
    public DateTimeOffset? CompletionTime { get; init; }

    /// <summary>
    /// Gets any error message from the workflow.
    /// </summary>
    public string? Error { get; init; }

    /// <summary>
    /// Gets any errors that occurred during the workflow.
    /// </summary>
    public IReadOnlyCollection<string> Errors { get; init; } = Array.Empty<string>();
}
