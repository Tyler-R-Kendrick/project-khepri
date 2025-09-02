using System.ComponentModel;

using Microsoft.SemanticKernel;

namespace Khepri.Khepri.Agents.Workflow;

/// <summary>
/// Step for generating modernization plan.
/// </summary>
public class GeneratePlanStep : KernelProcessStep
{
    /// <summary>
    /// Generates a modernization plan.
    /// </summary>
    /// <param name="context">The kernel process step context.</param>
    /// <param name="input">The input data.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    [KernelFunction]
    [Description("Generates modernization plan")]
    public static async Task GeneratePlanAsync(KernelProcessStepContext context, string input)
    {
        Console.WriteLine($"📝 Generating Modernization Plan from: {input}");
        string plan = $"Migration plan: {input} → Modern architecture";
        await context.EmitEventAsync(new KernelProcessEvent { Id = "plan_complete", Data = plan });
    }
}
