using Microsoft.SemanticKernel;

namespace Khepri.Khepri.Agents.Workflow;

/// <summary>
/// Main program entry point for the modernization workflow.
/// </summary>
public static class Program
{
    /// <summary>
    /// Main entry point for the application.
    /// </summary>
    /// <returns>A task representing the asynchronous operation.</returns>
    public static async Task Main()
    {
        // Create kernel
        Kernel kernel = Kernel.CreateBuilder()
            .AddOpenAIChatCompletion("gpt-3.5-turbo", Environment.GetEnvironmentVariable("OPENAI_API_KEY")!)
            .Build();

        // Create modernization workflow
        ProcessBuilder processBuilder = new("ModernizationWorkflow");
        ProcessStepBuilder step1 = processBuilder.AddStepFromType<GatherLegacyStep>();
        ProcessStepBuilder step2 = processBuilder.AddStepFromType<GatherTargetStep>();
        ProcessStepBuilder step3 = processBuilder.AddStepFromType<GeneratePlanStep>();
        ProcessStepBuilder step4 = processBuilder.AddStepFromType<ExecuteStep>();

        // Define workflow: Legacy → Target → Plan → Execute
        processBuilder.OnInputEvent("start").SendEventTo(new ProcessFunctionTargetBuilder(step1));
        step1.OnEvent("legacy_complete").SendEventTo(new ProcessFunctionTargetBuilder(step2));
        step2.OnEvent("target_complete").SendEventTo(new ProcessFunctionTargetBuilder(step3));
        step3.OnEvent("plan_complete").SendEventTo(new ProcessFunctionTargetBuilder(step4));

        // Run the workflow
        KernelProcess process = processBuilder.Build();
        await process.RunToEndAsync(kernel, new KernelProcessEvent { Id = "start", Data = "Legacy System Analysis" });
    }
}