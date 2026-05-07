using System;
using System.Collections.Generic;
using System.Linq;
using GitHub.Copilot.SDK;
using Microsoft.Agents.AI;
using Microsoft.Agents.AI.GitHub.Copilot;
using Microsoft.Extensions.AI;

namespace Khepri.Modernization.Workflow;

public static class GitHubCopilotModernizationAgentRegistry
{
    public static IReadOnlyList<CustomAgentConfig> CreateCustomAgentConfigs()
    {
        return
        [
            CreateAgent(ModernizationWorkflow.OrchestratorAgentName, "Project Khepri Orchestrator", "Coordinates the enforced modernization workflow and delegates to registered subagents.", ["read", "search", "agent", "github/*"], "Coordinate the Microsoft Agent Framework modernization workflow. Call registered subagents for each stage and preserve evidence for every handoff."),
            CreateAgent(ModernizationWorkflow.EvolutionAgentName, "Project Khepri Evolution", "Improves agents, skills, hooks, MCPs, evals, and steering while modernization work proceeds.", ["read", "search", "edit", "execute", "agent", "github/*"], "Run as the continuous improvement companion for every stage without blocking phase owners unless safety or correctness requires escalation."),
            CreateAgent(ModernizationWorkflow.SpecAgentName, "Project Khepri Spec", "Extracts or generates requirements, specs, tests, and test plans from legacy and target systems.", ["read", "search", "edit", "execute", "github/*"], "Extract legacy requirements, specs, and tests; extract target requirements, specs, and test-PLANS; hand off evidence and unknowns."),
            CreateAgent(ModernizationWorkflow.KnowledgeAgentName, "Project Khepri Knowledge", "Indexes legacy behavior, target standards, business context, and verification evidence.", ["read", "search", "edit", "github/*"], "Index modernization knowledge packets so planners and squads retrieve source-backed context instead of reinventing it."),
            CreateAgent(ModernizationWorkflow.PlannerAgentName, "Project Khepri Planner", "Creates high-level and stage-level incremental modernization plans.", ["read", "search", "edit", "agent", "github/*"], "Generate high-level incremental modernization plans, refine the current stage with squads, and require approval-ready verification gates."),
            CreateAgent(ModernizationWorkflow.ScaffoldAgentName, "Project Khepri Scaffold", "Executes approved modernization scaffolding plans and preserves minimal target seams.", ["read", "search", "edit", "execute", "agent"], "Execute only approved scaffolding plans. Keep generated target seams minimal, reviewable, and covered by legacy regression and TDD evidence."),
            CreateAgent(ModernizationWorkflow.CodeAgentName, "Project Khepri Code", "Implements approved modernization stages with tests first and narrow behavior changes.", ["read", "search", "edit", "execute", "agent"], "Use TDD for implementation. Keep legacy regression checks front-and-center in every red/green/refactor loop."),
            CreateAgent(ModernizationWorkflow.TestAgentName, "Project Khepri Test", "Runs reproducible test, AgentEvals, and regression verification commands.", ["read", "search", "execute"], "Run focused and broad verification, including AgentEvals from agentevals.io for tool-calling and relevance where squads change agent behavior."),
            CreateAgent(ModernizationWorkflow.AssessorAgentName, "Project Khepri Modernization Assessor", "Assesses parity, risk, acceptance evidence, and unresolved modernization gaps.", ["read", "search", "execute", "github/*"], "Assess modernization readiness only after legacy regression, AgentEvals, and acceptance evidence are available."),
            CreateAgent(ModernizationWorkflow.AppModernizationAgentName, "App Modernization", "Advises on application modernization patterns and when to use them.", ["read", "search", "agent", "github/*"], "Inform application modernization planning with strangler, branch by abstraction, API facade, contract test, feature flag, and modularization patterns."),
            CreateAgent(ModernizationWorkflow.DataModernizationAgentName, "Data Modernization", "Advises on data modernization patterns and when to use them.", ["read", "search", "agent", "github/*"], "Inform data modernization planning with expand/contract, CDC, dual-write, backfill, reconciliation, and data contract patterns."),
            CreateAgent(ModernizationWorkflow.InfraModernizationAgentName, "Infra Modernization", "Advises on infrastructure modernization patterns and when to use them.", ["read", "search", "agent", "github/*"], "Inform infrastructure modernization planning with infrastructure as code, blue-green, canary, observability, secrets, and rollback patterns.")
        ];
    }

    public static SessionConfig CreateSessionConfig(string workingDirectory, string model = "gpt-5.3-codex")
    {
        if (string.IsNullOrWhiteSpace(workingDirectory))
        {
            throw new ArgumentException("Working directory is required.", nameof(workingDirectory));
        }

        return new SessionConfig
        {
            ClientName = "project-khepri-modernization-workflow",
            Model = model,
            WorkingDirectory = workingDirectory,
            Agent = ModernizationWorkflow.OrchestratorAgentName,
            IncludeSubAgentStreamingEvents = true,
            OnPermissionRequest = PermissionHandler.ApproveAll,
            SkillDirectories = [".github/skills", ".copilot/skills"],
            CustomAgents = CreateCustomAgentConfigs().ToList()
        };
    }

    public static IReadOnlyDictionary<string, AIAgent> CreateMicrosoftAgentFrameworkAgents(CopilotClient copilotClient)
    {
        ArgumentNullException.ThrowIfNull(copilotClient);
        return CreateCustomAgentConfigs().ToDictionary(
            config => config.Name,
            config => (AIAgent)new GitHubCopilotAgent(
                copilotClient,
                ownsClient: false,
                id: config.Name,
                name: config.DisplayName ?? config.Name,
                description: config.Description ?? config.Name,
                tools: Array.Empty<AITool>(),
                instructions: config.Prompt ?? string.Empty),
            StringComparer.Ordinal);
    }

    private static CustomAgentConfig CreateAgent(
        string name,
        string displayName,
        string description,
        IReadOnlyList<string> tools,
        string prompt)
    {
        return new CustomAgentConfig
        {
            Name = name,
            DisplayName = displayName,
            Description = description,
            Tools = tools.ToList(),
            Prompt = prompt,
            Infer = true
        };
    }
}
