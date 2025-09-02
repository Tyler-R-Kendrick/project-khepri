using System.ComponentModel;

using Microsoft.SemanticKernel;

namespace Khepri.Khepri.Agents.Workflow;

/// <summary>
/// Step for executing the modernization.
/// </summary>
public class ExecuteStep : KernelProcessStep
{
    /// <summary>
    /// Executes the modernization process.
    /// </summary>
    /// <param name="input">The input data.</param>
    [KernelFunction]
    [Description("Executes the modernization")]
    public static void Execute(string input)
    {
        Console.WriteLine($"⚡ Executing: {input}");
        Console.WriteLine("✅ Modernization workflow completed!");
    }
}
