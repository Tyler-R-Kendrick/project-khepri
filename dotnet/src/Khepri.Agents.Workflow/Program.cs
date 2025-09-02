using Microsoft.Extensions.Configuration;
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
        IConfigurationRoot configuration = new ConfigurationBuilder()
            .AddEnvironmentVariables()
            .Build();

        string inferenceToken =
            configuration["INFERENCE_TOKEN"]
            ?? configuration["GITHUB_TOKEN"]
            ?? throw new InvalidOperationException(
                "GITHUB_TOKEN was not found. In GitHub Codespaces it should be injected automatically.");

        // IMPORTANT (Sept 2025): GitHub Models uses the new endpoint below.
        // The older Azure-hosted endpoint is deprecated.
        string inferenceEndpoint = configuration["INFERENCE_URI"] ?? "https://models.github.ai";

        // Choose any model from GitHub Models; here we use an OpenAI-compatible one.
        // Examples include: "openai/gpt-4o-mini", "microsoft/Phi-4-mini-instruct", etc.
        string inferenceModel = configuration["INFERENCE_MODEL"] ?? "openai/gpt-5";

        Kernel kernel = Kernel.CreateBuilder()
            .AddAzureAIInferenceChatCompletion(
                modelId: inferenceModel,
                apiKey: inferenceToken,
                endpoint: new(inferenceEndpoint))
            .Build();

        ProcessBuilder processBuilder = new("ModernizationWorkflow");
        processBuilder.ConfigureModernizationWorkflow();
        KernelProcess process = processBuilder.Build();
        KernelProcessEvent initialEvent = new() { Id = "start", Data = "Legacy System Analysis" };
        await process.RunToEndAsync(kernel, initialEvent);
    }
}
