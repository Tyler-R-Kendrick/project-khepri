using Khepri.Khepri.Agents.Workflow.Models;

namespace Khepri.Khepri.Agents.Workflow.Services;

/// <summary>
/// Interface for workflow orchestration services.
/// </summary>
public interface IWorkflowOrchestrationService
{
    /// <summary>
    /// Executes the complete modernization workflow according to PRD specifications.
    /// </summary>
    /// <param name="request">The workflow start request.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The workflow execution result.</returns>
    Task<WorkflowState> ExecuteModernizationWorkflowAsync(
        StartWorkflowRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the current state of a workflow.
    /// </summary>
    /// <param name="workflowId">The workflow identifier.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The current workflow state.</returns>
    Task<WorkflowState?> GetWorkflowStateAsync(
        string workflowId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Cancels a running workflow.
    /// </summary>
    /// <param name="workflowId">The workflow identifier.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    Task CancelWorkflowAsync(
        string workflowId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all active workflows.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of active workflow states.</returns>
    Task<IReadOnlyCollection<WorkflowState>> GetActiveWorkflowsAsync(
        CancellationToken cancellationToken = default);
}
