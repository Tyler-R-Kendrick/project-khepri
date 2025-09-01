using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Agents;
using Microsoft.SemanticKernel.ChatCompletion;

#pragma warning disable SKEXP0110 // ChatCompletionAgent is experimental

var builder = WebApplication.CreateBuilder(args);

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
builder.Services.AddSingleton<Kernel>(serviceProvider =>
{
    var kernelBuilder = Kernel.CreateBuilder();
    
    // TODO: Configure AI service (Azure OpenAI, OpenAI, etc.)
    var aiEndpoint = builder.Configuration["AI:Endpoint"];
    var aiKey = builder.Configuration["AI:ApiKey"];
    var deploymentName = builder.Configuration["AI:DeploymentName"];
    
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

// Add Workflow Agent as a singleton service
builder.Services.AddSingleton<ChatCompletionAgent>(serviceProvider =>
{
    var kernel = serviceProvider.GetRequiredService<Kernel>();
    
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
            { "temperature", 0.3 } // Moderate temperature for balanced decision making
        })
    };
});

var app = builder.Build();

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
    ChatCompletionAgent workflowAgent,
    IHttpClientFactory httpClientFactory,
    ILogger<Program> logger) =>
{
    try
    {
        var workflowPrompt = $"""
            Start a modernization workflow for the following project:
            
            Project Path: {request.ProjectPath}
            Modernization Goals: {string.Join(", ", request.Goals)}
            Target Framework: {request.TargetFramework ?? "Latest .NET"}
            
            Please coordinate with the agents in the following sequence:
            1. Knowledge Agent - Analyze the codebase
            2. Planning Agent - Create modernization plan
            3. Development Agent - Implement changes with TDD
            4. User Delegation Agent - Handle approvals and feedback
            
            Return a workflow execution plan.
            """;

        var chatHistory = new ChatHistory();
        chatHistory.AddUserMessage(workflowPrompt);

        var responses = new List<string>();
        await foreach (var response in workflowAgent.InvokeAsync(chatHistory))
        {
            responses.Add(response.Content ?? "");
        }

        var workflowId = Guid.NewGuid().ToString();
        var result = new
        {
            WorkflowId = workflowId,
            AgentName = "WorkflowAgent",
            ExecutionPlan = string.Join("\n", responses),
            Status = "Started",
            Timestamp = DateTimeOffset.UtcNow
        };

        logger.LogInformation("Modernization workflow {WorkflowId} started for project {ProjectPath}", 
            workflowId, request.ProjectPath);
        
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
    IHttpClientFactory httpClientFactory,
    ILogger<Program> logger) =>
{
    try
    {
        // Check health of all agents
        var agentHealths = new Dictionary<string, object>();
        var agentNames = new[] { "KnowledgeAgent", "PlanningAgent", "DevelopmentAgent", "UserDelegationAgent" };
        
        foreach (var agentName in agentNames)
        {
            try
            {
                var httpClient = httpClientFactory.CreateClient(agentName);
                var healthEndpoint = agentName.ToLower().Replace("agent", "-agent");
                var response = await httpClient.GetAsync($"/api/{healthEndpoint.Replace("-agent", "")}/health");
                
                agentHealths[agentName] = new
                {
                    Status = response.IsSuccessStatusCode ? "Healthy" : "Unhealthy",
                    StatusCode = (int)response.StatusCode
                };
            }
            catch (Exception ex)
            {
                agentHealths[agentName] = new
                {
                    Status = "Unreachable",
                    Error = ex.Message
                };
            }
        }

        var result = new
        {
            WorkflowId = workflowId,
            AgentHealths = agentHealths,
            OverallStatus = agentHealths.Values.All(h => 
                h.GetType().GetProperty("Status")?.GetValue(h)?.ToString() == "Healthy") 
                ? "Healthy" : "Degraded",
            Timestamp = DateTimeOffset.UtcNow
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
.WithSummary("Get workflow status and agent health")
.WithOpenApi();

app.MapGet("/api/workflow/health", (ChatCompletionAgent workflowAgent) =>
{
    return Results.Ok(new
    {
        AgentName = workflowAgent.Name,
        Status = "Healthy",
        Timestamp = DateTimeOffset.UtcNow
    });
})
.WithName("GetWorkflowAgentHealth")
.WithSummary("Get Workflow Agent health status")
.WithOpenApi();

app.Run();

// Request/Response models
public record StartWorkflowRequest(
    string ProjectPath,
    string[] Goals,
    string? TargetFramework = null
);

#pragma warning restore SKEXP0110
