namespace Khepri.Khepri.Agents.Workflow.Models;

/// <summary>
/// Request model for starting a modernization workflow.
/// </summary>
/// <param name="ProjectPath">The path to the project to modernize.</param>
/// <param name="Goals">The modernization goals.</param>
/// <param name="TargetFramework">The target framework version.</param>
public record StartWorkflowRequest(
    string ProjectPath,
    IReadOnlyCollection<string> Goals,
    string? TargetFramework = null);
