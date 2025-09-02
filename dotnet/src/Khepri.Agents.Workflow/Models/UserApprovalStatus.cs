namespace Khepri.Khepri.Agents.Workflow.Models;

/// <summary>
/// Represents user approval status.
/// </summary>
public record UserApprovalStatus
{
    /// <summary>
    /// Gets a value indicating whether the plan was approved.
    /// </summary>
    public required bool IsApproved { get; init; }

    /// <summary>
    /// Gets the approval timestamp.
    /// </summary>
    public required DateTimeOffset ApprovalTime { get; init; }

    /// <summary>
    /// Gets any user feedback or comments.
    /// </summary>
    public string? UserFeedback { get; init; }

    /// <summary>
    /// Gets any requested modifications.
    /// </summary>
    public IReadOnlyCollection<string> RequestedModifications { get; init; } = Array.Empty<string>();
}
