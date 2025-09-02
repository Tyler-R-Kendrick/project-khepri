using Microsoft.SemanticKernel;

namespace Khepri.Khepri.Agents.Workflow;

public static class WorkflowBuilderExtensions
{
    /// <summary>
    /// Main entry point for the application.
    /// </summary>
    /// <param name="processBuilder">The process builder to configure the workflow.</param>
    public static void ConfigureModernizationWorkflow(this ProcessBuilder processBuilder)
    {
        ProcessStepBuilder ConfigureStep<T>()
            where T : KernelProcessStep
        {
            return processBuilder.AddStepFromType<T>();
        }

        ProcessStepBuilder gatherLegacyKnowledge = ConfigureStep<GatherLegacyStep>();
        ProcessStepBuilder gatherTargetKnowledge = ConfigureStep<GatherTargetStep>();
        ProcessStepBuilder generatePlan = ConfigureStep<GeneratePlanStep>();
        ProcessStepBuilder executePlan = ConfigureStep<ExecuteStep>();

        // Define workflow: Legacy → Target → Plan → Execute
        processBuilder
            .OnInputEvent("start")
            .SendEventTo(new ProcessFunctionTargetBuilder(gatherLegacyKnowledge));
        gatherLegacyKnowledge
            .OnEvent("legacy_complete")
            .SendEventTo(new ProcessFunctionTargetBuilder(gatherTargetKnowledge));
        gatherTargetKnowledge
            .OnEvent("target_complete")
            .SendEventTo(new ProcessFunctionTargetBuilder(generatePlan));
        generatePlan
            .OnEvent("plan_complete")
            .SendEventTo(new ProcessFunctionTargetBuilder(executePlan));
    }
}