using System.Diagnostics;
using System.Diagnostics.Metrics;
using Khepri.Khepri.ServiceDefaults;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Agents;
using Microsoft.SemanticKernel.ChatCompletion;

#pragma warning disable SKEXP0110 // ChatCompletionAgent is experimental

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

// Add Aspire service defaults (observability, health checks, etc.)
builder.AddServiceDefaults();

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Create custom metrics
Meter meter = new("Khepri.Agents.Planning");
Counter<int> planningRequestCounter = meter.CreateCounter<int>("planning_requests_total", "count", "Total number of planning requests");
Histogram<double> planningDuration = meter.CreateHistogram<double>("planning_duration_ms", "ms", "Duration of planning operations");

// Configure Semantic Kernel with AI services
builder.Services.AddSingleton(serviceProvider =>
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
        Console.WriteLine("AI configuration not found. Running in development mode.");
    }

    return kernelBuilder.Build();
});

// Add Planning Agent as a singleton service
builder.Services.AddSingleton(serviceProvider =>
{
    Kernel kernel = serviceProvider.GetRequiredService<Kernel>();

    return new ChatCompletionAgent
    {
        Name = "PlanningAgent",
        Instructions = """
            You are a Planning Agent responsible for coordinating modernization workflows.
            Your responsibilities include:
            
            1. Create comprehensive modernization plans
            2. Coordinate with Knowledge Agent for analysis requirements
            3. Generate user approval requests for Development Agent
            4. Manage workflow orchestration and dependencies
            5. Ensure quality gates and compliance requirements
            
            Focus on creating actionable, prioritized plans with clear acceptance criteria.
            Always collaborate with other agents to ensure comprehensive coverage.
            """,
        Kernel = kernel,
        Arguments = new KernelArguments(new Dictionary<string, object?>
        {
            { "max_tokens", 4000 },
            { "temperature", 0.2 }, // Low temperature for consistent planning
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

// Planning Agent API endpoints
app.MapPost("/api/planning/create-plan", async (
    string projectInput,
    ChatCompletionAgent planningAgent,
    ILogger<object> logger) =>
{
    using Activity? activity = Activity.Current?.Source.StartActivity("CreatePlan");
    Stopwatch stopwatch = Stopwatch.StartNew();

    try
    {
        planningRequestCounter.Add(1, [new KeyValuePair<string, object?>("operation", "create_plan")]);

        string planningPrompt = $"""
            Create a comprehensive modernization plan for the following project:

            {projectInput}

            Please provide:
            1. Analysis requirements for Knowledge Agent
            2. Development phases and priorities
            3. Quality gates and acceptance criteria
            4. Risk assessment and mitigation strategies
            5. User approval checkpoints
            """;

        ChatHistory chatHistory = [];
        chatHistory.AddUserMessage(planningPrompt);

        List<string> responses = [];
        await foreach (ChatMessageContent response in planningAgent.InvokeAsync(chatHistory))
        {
            responses.Add(response.Content ?? string.Empty);
        }

        object result = new
        {
            AgentName = "PlanningAgent",
            Plan = string.Join("\n", responses),
            Timestamp = DateTimeOffset.UtcNow,
            DurationMs = stopwatch.ElapsedMilliseconds,
        };

        planningDuration.Record(stopwatch.ElapsedMilliseconds, [new KeyValuePair<string, object?>("operation", "create_plan")]);
        logger.LogInformation("Planning completed for project input in {Duration}ms", stopwatch.ElapsedMilliseconds);

        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error during planning");
        return Results.Problem("Error during planning");
    }
    finally
    {
        stopwatch.Stop();
    }
})
.WithName("CreatePlan")
.WithSummary("Create a modernization plan")
.WithOpenApi();

app.MapGet("/api/planning/health", (ChatCompletionAgent planningAgent) =>
{
    return Results.Ok(new
    {
        AgentName = planningAgent.Name,
        Status = "Healthy",
        Timestamp = DateTimeOffset.UtcNow,
    });
})
.WithName("GetPlanningAgentHealth")
.WithSummary("Get Planning Agent health status")
.WithOpenApi();

await app.RunAsync();

#pragma warning restore SKEXP0110
