using Aspire.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

// Add all agent services
var knowledgeAgent = builder.AddProject<Projects.Khepri_Agents_Knowledge>("knowledge-agent");
var planningAgent = builder.AddProject<Projects.Khepri_Agents_Planning>("planning-agent");
var developmentAgent = builder.AddProject<Projects.Khepri_Agents_Development>("development-agent");
var userDelegationAgent = builder.AddProject<Projects.Khepri_Agents_UserDelegation>("user-delegation-agent");

builder.Build().Run();
