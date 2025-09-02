using System.ComponentModel;

using Microsoft.SemanticKernel;

namespace Khepri.Khepri.Agents.Workflow;

/// <summary>
/// Step for gathering legacy system knowledge.
/// </summary>
public class GatherLegacyStep : KernelProcessStep
{
    /// <summary>
    /// Processes legacy system information.
    /// </summary>
    /// <param name="context">The kernel process step context.</param>
    /// <param name="input">The input data.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    [KernelFunction]
    [Description("Gathers legacy system knowledge")]
    public static async Task ProcessLegacyAsync(KernelProcessStepContext context, string input)
    {
        Console.WriteLine($"📋 Gathering Legacy Knowledge: {input}");
        string legacyInfo = $"Legacy analysis of {input}";
        await context.EmitEventAsync(new KernelProcessEvent { Id = "legacy_complete", Data = legacyInfo });
    }
}
