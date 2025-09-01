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

// Configure Semantic Kernel with AI services
builder.Services.AddSingleton<Kernel>(serviceProvider =>
{
    var kernelBuilder = Kernel.CreateBuilder();
    
    // TODO: Configure AI service (Azure OpenAI, OpenAI, etc.)
    // This will be configured through environment variables or configuration
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

// Add Knowledge Agent as a singleton service
builder.Services.AddSingleton<ChatCompletionAgent>(serviceProvider =>
{
    var kernel = serviceProvider.GetRequiredService<Kernel>();
    
    return new ChatCompletionAgent
    {
        Name = "KnowledgeAgent",
        Instructions = """
            You are a Knowledge Agent specialized in analyzing codebases and generating 
            comprehensive knowledge assets. Your responsibilities include:
            
            1. Extract and generate code documentation
            2. Maintain LSIF (Language Server Index Format) data
            3. Create behavior specifications (Gherkin format)
            4. Build and maintain knowledge graphs
            5. Analyze existing documentation and code comments
            6. Collaborate with Planning Agent for knowledge generation plans
            
            Focus on multi-level knowledge extraction: syntactic, semantic, and behavioral.
            Always ensure accuracy and completeness in your analysis.
            """,
        Kernel = kernel,
        Arguments = new KernelArguments(new Dictionary<string, object?>
        {
            { "max_tokens", 4000 },
            { "temperature", 0.1 } // Low temperature for consistent analysis
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

// Knowledge Agent API endpoints
app.MapPost("/api/knowledge/analyze", async (
    string codeInput,
    ChatCompletionAgent knowledgeAgent,
    ILogger<Program> logger) =>
{
    try
    {
        var analysisPrompt = $"""
            Analyze the following code and extract knowledge assets:
            
            {codeInput}
            
            Please provide:
            1. Code documentation (if missing)
            2. Behavioral specifications
            3. Dependency analysis
            4. Knowledge graph elements
            """;

        // Create chat history for the agent
        var chatHistory = new ChatHistory();
        chatHistory.AddUserMessage(analysisPrompt);

        var responses = new List<string>();
        await foreach (var response in knowledgeAgent.InvokeAsync(chatHistory))
        {
            responses.Add(response.Content ?? "");
        }

        var result = new
        {
            AgentName = "KnowledgeAgent",
            Analysis = string.Join("\n", responses),
            Timestamp = DateTimeOffset.UtcNow
        };

        logger.LogInformation("Knowledge analysis completed for input of length {Length}", codeInput.Length);
        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error during knowledge analysis");
        return Results.Problem("Error during knowledge analysis");
    }
})
.WithName("AnalyzeKnowledge")
.WithSummary("Analyze code and extract knowledge assets")
.WithOpenApi();

app.MapGet("/api/knowledge/health", (ChatCompletionAgent knowledgeAgent) =>
{
    return Results.Ok(new
    {
        AgentName = knowledgeAgent.Name,
        Status = "Healthy",
        Timestamp = DateTimeOffset.UtcNow
    });
})
.WithName("GetKnowledgeAgentHealth")
.WithSummary("Get Knowledge Agent health status")
.WithOpenApi();

app.Run();

#pragma warning restore SKEXP0110
