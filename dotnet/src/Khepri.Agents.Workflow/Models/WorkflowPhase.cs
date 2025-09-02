namespace Khepri.Khepri.Agents.Workflow.Models;

/// <summary>
/// Represents the different phases of a modernization workflow.
/// </summary>
public enum WorkflowPhase
{
    /// <summary>
    /// Initial state - workflow not started.
    /// </summary>
    NotStarted,

    /// <summary>
    /// Knowledge acquisition and analysis phase.
    /// </summary>
    KnowledgeAnalysis,

    /// <summary>
    /// Planning and dependency analysis phase.
    /// </summary>
    Planning,

    /// <summary>
    /// User approval phase.
    /// </summary>
    UserApproval,

    /// <summary>
    /// Implementation and development phase.
    /// </summary>
    Implementation,

    /// <summary>
    /// Workflow completed successfully.
    /// </summary>
    Completed,

    /// <summary>
    /// Workflow failed with errors.
    /// </summary>
    Failed,

    /// <summary>
    /// Workflow was cancelled.
    /// </summary>
    Cancelled,
}
