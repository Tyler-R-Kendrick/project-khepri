using Aspire.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

// Infrastructure Services
var stateStore = builder.AddRedis("state-store")
    .WithPersistence();

// Knowledge Agent - Entry point for codebase analysis
var knowledgeAgent = builder.AddProject<Projects.Khepri_Agents_Knowledge>("knowledge-agent")
    .WithReference(stateStore)
    .WithReplicas(2); // Scale for concurrent analysis tasks

// Planning Agent - Coordinates workflow and user collaboration
var planningAgent = builder.AddProject<Projects.Khepri_Agents_Planning>("planning-agent")
    .WithReference(stateStore)
    .WithReference(knowledgeAgent); // Depends on knowledge extraction

// Development Agent - Implements TDD cycles
var developmentAgent = builder.AddProject<Projects.Khepri_Agents_Development>("development-agent")
    .WithReference(stateStore)
    .WithReference(planningAgent); // Depends on approved plans

// User Delegation Agent - Manages user preferences and approvals
var userDelegationAgent = builder.AddProject<Projects.Khepri_Agents_UserDelegation>("user-delegation-agent")
    .WithReference(stateStore)
    .WithReference(planningAgent); // Receives approval requests

// Workflow Agent - Orchestrates the entire modernization workflow
var workflowAgent = builder.AddProject<Projects.Khepri_Agents_Workflow>("workflow-agent")
    .WithReference(stateStore)
    .WithReference(knowledgeAgent)
    .WithReference(planningAgent)
    .WithReference(developmentAgent)
    .WithReference(userDelegationAgent); // Coordinates all agents

builder.Build().Run();
