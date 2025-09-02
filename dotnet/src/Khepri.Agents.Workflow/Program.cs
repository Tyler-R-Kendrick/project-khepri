using Khepri.Khepri.Agents.Workflow.Models;
using Khepri.Khepri.Agents.Workflow.Services;
using Khepri.Khepri.ServiceDefaults;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Agents;

namespace Khepri.Khepri.Agents.Workflow;

#pragma warning disable SKEXP0110 // ChatCompletionAgent is experimental

/// <summary>
/// Entry point for the Workflow Agent application.
/// </summary>
public static class Program
{
    /// <summary>
    /// Main entry point.
    /// </summary>
    /// <param name="args">Command line arguments.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    public static async Task Main(string[] args)
    {
        WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

        // Add Aspire service defaults (observability, health checks, etc.)
        builder.AddServiceDefaults();

        // Add services to the container
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        // Configure HTTP clients for inter-agent communication
        builder.Services.AddHttpClient("KnowledgeAgent", client =>
        {
            client.BaseAddress = new Uri("https+http://knowledge-agent");
        });

        builder.Services.AddHttpClient("PlanningAgent", client =>
        {
            client.BaseAddress = new Uri("https+http://planning-agent");
        });

        builder.Services.AddHttpClient("DevelopmentAgent", client =>
        {
            client.BaseAddress = new Uri("https+http://development-agent");
        });

        builder.Services.AddHttpClient("UserDelegationAgent", client =>
        {
            client.BaseAddress = new Uri("https+http://user-delegation-agent");
        });

        // Configure Semantic Kernel with AI services
        builder.Services.AddSingleton(_ =>
        {
            IKernelBuilder kernelBuilder = Kernel.CreateBuilder();

            // TODO: Configure AI service (Azure OpenAI, OpenAI, etc.)
            string? aiEndpoint = builder.Configuration["AI:Endpoint"];
            string? aiKey = builder.Configuration["AI:ApiKey"];
            string? deploymentName = builder.Configuration["AI:DeploymentName"];

            if (!string.IsNullOrEmpty(aiEndpoint) && !string.IsNullOrEmpty(aiKey) && !string.IsNullOrEmpty(deploymentName))
            {
                kernelBuilder.AddAzureOpenAIChatCompletion(
                    deploymentName: deploymentName,
                    endpoint: aiEndpoint,
                    apiKey: aiKey);
            }
            else
            {
                // Fallback to mock or development service
                Console.WriteLine("AI configuration not found. Running in development mode.");
            }

            return kernelBuilder.Build();
        });

        // Add Workflow Orchestration Service
        builder.Services.AddSingleton<IWorkflowOrchestrationService, WorkflowOrchestrationService>();

        // Add Workflow Agent as a singleton service
        builder.Services.AddSingleton(serviceProvider =>
        {
            Kernel kernel = serviceProvider.GetRequiredService<Kernel>();

            return new ChatCompletionAgent
            {
                Name = "WorkflowAgent",
                Instructions = """
                    You are a Workflow Agent responsible for orchestrating the modernization workflow 
                    across all specialized agents. Your responsibilities include:
                    
                    1. Coordinate multi-agent workflows using Semantic Kernel Process Framework
                    2. Manage the modernization pipeline: Knowledge → Planning → Development → User Delegation
                    3. Monitor agent health and workflow state
                    4. Handle workflow failures and recovery scenarios
                    5. Ensure proper sequencing and dependency management between agents
                    6. Maintain workflow state and progress tracking
                    
                    You act as the conductor for the entire modernization orchestra, ensuring
                    all agents work together harmoniously to achieve the modernization goals.
                    """,
                Kernel = kernel,
                Arguments = new KernelArguments(new Dictionary<string, object?>
                {
                    { "max_tokens", 4000 },
                    { "temperature", 0.3 }, // Moderate temperature for balanced decision making
                }),
            };
        });

        WebApplication app = builder.Build();

        // Map Aspire default endpoints (health checks, metrics, etc.)
        app.MapDefaultEndpoints();

        // Configure the HTTP request pipeline
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseHttpsRedirection();

        // Workflow Agent API endpoints
        app.MapPost("/api/workflow/start", async (
            StartWorkflowRequest request,
            IWorkflowOrchestrationService orchestrationService,
            ILogger<object> logger) =>
        {
            try
            {
                WorkflowState result = await orchestrationService.ExecuteModernizationWorkflowAsync(request);

                logger.LogInformation(
                    "Modernization workflow {WorkflowId} started for project {ProjectPath}",
                    result.WorkflowId,
                    request.ProjectPath);

                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error starting modernization workflow");
                return Results.Problem("Error starting modernization workflow");
            }
        })
        .WithName("StartWorkflow")
        .WithSummary("Start a modernization workflow")
        .WithOpenApi();

        app.MapGet("/api/workflow/status/{workflowId}", async (
            string workflowId,
            IWorkflowOrchestrationService orchestrationService,
            ILogger<object> logger) =>
        {
            try
            {
                // Get workflow status from orchestration service
                WorkflowState? workflowState = await orchestrationService.GetWorkflowStateAsync(workflowId);

                if (workflowState is null)
                {
                    return Results.NotFound($"Workflow {workflowId} not found");
                }

                object result = new
                {
                    workflowState.WorkflowId,
                    Status = workflowState.Phase.ToString(),
                    CurrentPhase = workflowState.Phase.ToString(),
                    workflowState.ProjectPath,
                    workflowState.Goals,
                    workflowState.StartTime,
                    workflowState.CompletionTime,
                    workflowState.Error,
                    Timestamp = DateTimeOffset.UtcNow,
                };

                return Results.Ok(result);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error checking workflow status for {WorkflowId}", workflowId);
                return Results.Problem("Error checking workflow status");
            }
        })
        .WithName("GetWorkflowStatus")
        .WithSummary("Get workflow status and progress")
        .WithOpenApi();

        app.MapGet("/api/workflow/health", (ChatCompletionAgent workflowAgent) =>
        {
            return Results.Ok(new
            {
                AgentName = workflowAgent.Name,
                Status = "Healthy",
                Timestamp = DateTimeOffset.UtcNow,
            });
        })
        .WithName("GetWorkflowAgentHealth")
        .WithSummary("Get Workflow Agent health status")
        .WithOpenApi();

        await app.RunAsync();
    }
}

#pragma warning restore SKEXP0110
