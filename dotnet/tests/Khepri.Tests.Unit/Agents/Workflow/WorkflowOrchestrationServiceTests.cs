using Khepri.Khepri.Agents.Workflow.Models;
using Xunit;

namespace Khepri.Agents.Workflow;

/// <summary>
/// Unit tests for the WorkflowOrchestrationService.
/// </summary>
public class WorkflowOrchestrationServiceTests
{
    [Fact]
    public void StartWorkflowRequest_ShouldBeCreatedCorrectly()
    {
        // Arrange & Act
        StartWorkflowRequest request = new(
            "/test/project",
            ["Modernize to .NET 8", "Add observability"],
            "net8.0");

        // Assert
        Assert.Equal("/test/project", request.ProjectPath);
        Assert.Equal(2, request.Goals.Count);
        Assert.Contains("Modernize to .NET 8", request.Goals);
        Assert.Contains("Add observability", request.Goals);
        Assert.Equal("net8.0", request.TargetFramework);
    }

    [Fact]
    public void WorkflowPhase_ShouldHaveCorrectValues()
    {
        // Assert
        Assert.Equal(0, (int)WorkflowPhase.NotStarted);
        Assert.Equal(1, (int)WorkflowPhase.KnowledgeAnalysis);
        Assert.Equal(2, (int)WorkflowPhase.Planning);
        Assert.Equal(3, (int)WorkflowPhase.UserApproval);
        Assert.Equal(4, (int)WorkflowPhase.Implementation);
        Assert.Equal(5, (int)WorkflowPhase.Completed);
        Assert.Equal(6, (int)WorkflowPhase.Failed);
        Assert.Equal(7, (int)WorkflowPhase.Cancelled);
    }

    [Fact]
    public void WorkflowState_ShouldBeCreatedWithRequiredProperties()
    {
        // Arrange & Act
        WorkflowState workflowState = new()
        {
            WorkflowId = "test-id",
            Phase = WorkflowPhase.NotStarted,
            ProjectPath = "/test/project",
            Goals = ["Modernize to .NET 8"],
            TargetFramework = "net8.0",
        };

        // Assert
        Assert.Equal("test-id", workflowState.WorkflowId);
        Assert.Equal(WorkflowPhase.NotStarted, workflowState.Phase);
        Assert.Equal("/test/project", workflowState.ProjectPath);
        Assert.Single(workflowState.Goals);
        Assert.Equal("net8.0", workflowState.TargetFramework);
        Assert.True(workflowState.StartTime <= DateTimeOffset.UtcNow);
        Assert.Empty(workflowState.Errors);
    }

    [Fact]
    public void KnowledgeAnalysisResult_ShouldBeCreatedCorrectly()
    {
        // Arrange & Act
        KnowledgeAnalysisResult result = new()
        {
            KnowledgeAssets = ["asset1", "asset2"],
            DocumentationGaps = ["gap1"],
            BehaviorSpecs = ["spec1"],
        };

        // Assert
        Assert.Equal(2, result.KnowledgeAssets.Count);
        Assert.Single(result.DocumentationGaps);
        Assert.Single(result.BehaviorSpecs);
    }

    [Fact]
    public void ModernizationPlan_ShouldBeCreatedCorrectly()
    {
        // Arrange & Act
        ModernizationPlan plan = new()
        {
            MigrationStrategy = "Incremental migration",
            Dependencies = ["dep1"],
            ArchitecturalChanges = ["change1"],
            TestStrategy = "TDD approach",
            ImplementationSteps = ["step1"],
            EstimatedEffort = "Medium",
            Risks = ["risk1"],
        };

        // Assert
        Assert.Equal("Incremental migration", plan.MigrationStrategy);
        Assert.Single(plan.Dependencies);
        Assert.Single(plan.ArchitecturalChanges);
        Assert.Equal("TDD approach", plan.TestStrategy);
        Assert.Single(plan.ImplementationSteps);
        Assert.Equal("Medium", plan.EstimatedEffort);
        Assert.Single(plan.Risks);
    }

    [Fact]
    public void UserApprovalStatus_ShouldBeCreatedCorrectly()
    {
        // Arrange
        DateTimeOffset timestamp = DateTimeOffset.UtcNow;

        // Act
        UserApprovalStatus approval = new()
        {
            IsApproved = true,
            ApprovalTime = timestamp,
            UserFeedback = "Looks good",
        };

        // Assert
        Assert.True(approval.IsApproved);
        Assert.Equal("Looks good", approval.UserFeedback);
        Assert.Equal(timestamp, approval.ApprovalTime);
    }

    [Fact]
    public void ImplementationResult_ShouldBeCreatedCorrectly()
    {
        // Arrange & Act
        ImplementationResult result = new()
        {
            Status = "Completed",
            TestResults = ["test1 passed"],
            CodeArtifacts = ["file1.cs"],
            RegressionTests = ["regression1"],
        };

        // Assert
        Assert.Equal("Completed", result.Status);
        Assert.Single(result.TestResults);
        Assert.Single(result.CodeArtifacts);
        Assert.Single(result.RegressionTests);
    }
}
