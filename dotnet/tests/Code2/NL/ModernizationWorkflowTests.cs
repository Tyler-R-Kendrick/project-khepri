using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Khepri.Modernization.Workflow;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Khepri.Code2NL.Tests;

[TestClass]
public sealed class ModernizationWorkflowTests
{
    [TestMethod]
    public void ContractEnforcesRequiredWorkflowOrder()
    {
        var contract = ModernizationWorkflow.CreateContract();

        CollectionAssert.AreEqual(
            new[]
            {
                "legacy-requirements-specs-tests",
                "target-requirements-specs-test-plans",
                "incremental-modernization-plan",
                "increment-area-squads",
                "current-stage-plan-refinement",
                "tdd-modernization-execution"
            },
            contract.Stages.Select(stage => stage.Id).ToArray());
    }

    [TestMethod]
    public void ContractCreatesAreaSquadsForEachModernizationIncrement()
    {
        var contract = ModernizationWorkflow.CreateContract();
        var squadStage = contract.Stages.Single(stage => stage.Id == "increment-area-squads");

        CollectionAssert.AreEquivalent(
            new[] { "App", "Data", "Infra", "Security" },
            squadStage.Areas.Select(area => area.ToString()).ToArray());
        Assert.IsTrue(squadStage.RequiredEvidence.Any(item => item.Contains("AgentEvals", StringComparison.Ordinal)));
        Assert.IsTrue(squadStage.RequiredEvidence.Any(item => item.Contains("tool-calling", StringComparison.Ordinal)));
        Assert.IsTrue(squadStage.RequiredEvidence.Any(item => item.Contains("relevance", StringComparison.Ordinal)));
    }

    [TestMethod]
    public void ContractRequiresPrebuiltAgentEvalsForSquadImplementation()
    {
        var contract = ModernizationWorkflow.CreateContract();
        var squadStage = contract.Stages.Single(stage => stage.Id == "increment-area-squads");

        Assert.IsTrue(squadStage.RequiredAgentEvals.Any(eval => eval.EvaluatorType == "tool_trajectory"));
        Assert.IsTrue(squadStage.RequiredAgentEvals.Any(eval => eval.Name == "relevance" && eval.EvaluatorType == "llm_judge"));
    }

    [TestMethod]
    public void EveryWorkflowStageHasAgentEvalCoverageForAgenticBehavior()
    {
        var contract = ModernizationWorkflow.CreateContract();

        foreach (var stage in contract.Stages)
        {
            Assert.IsTrue(
                stage.RequiredAgentEvals.Any(eval => eval.EvaluatorType == "tool_trajectory"),
                $"{stage.Id} must prove registered tool and subagent calls with a tool_trajectory evaluator.");
            Assert.IsTrue(
                stage.RequiredAgentEvals.Any(eval => eval.Name == "relevance" && eval.EvaluatorType == "llm_judge"),
                $"{stage.Id} must prove relevance with an llm_judge evaluator.");
            Assert.IsTrue(
                stage.RequiredAgentEvals.Any(eval => eval.EvaluatorType == "rubric"),
                $"{stage.Id} must have rubric coverage for evidence completeness.");
        }
    }

    [TestMethod]
    public void AgentCallPlanCoversEveryStageAndRegisteredAgent()
    {
        var contract = ModernizationWorkflow.CreateContract();
        var callPlan = ModernizationWorkflow.CreateAgentCallPlan();

        CollectionAssert.AreEqual(
            contract.Stages.Select(stage => stage.Id).ToArray(),
            callPlan.Select(call => call.StageId).ToArray());

        foreach (var stage in contract.Stages)
        {
            var call = callPlan.Single(item => item.StageId == stage.Id);
            CollectionAssert.Contains(call.AgentNames.ToArray(), ModernizationWorkflow.OrchestratorAgentName);
            CollectionAssert.Contains(call.AgentNames.ToArray(), ModernizationWorkflow.EvolutionAgentName);

            foreach (var requiredAgent in stage.RequiredAgents)
            {
                CollectionAssert.Contains(call.AgentNames.ToArray(), requiredAgent, $"{stage.Id} must call {requiredAgent}.");
            }

            CollectionAssert.AreEqual(stage.RequiredEvidence.ToArray(), call.RequiredEvidence.ToArray());
            CollectionAssert.AreEqual(stage.RequiredAgentEvals.ToArray(), call.RequiredAgentEvals.ToArray());
        }

        var executionOrder = ModernizationWorkflow.CreateAgentExecutionOrder();
        CollectionAssert.AreEquivalent(contract.RegisteredAgents.ToArray(), executionOrder.ToArray());
        Assert.AreEqual(ModernizationWorkflow.OrchestratorAgentName, executionOrder[0]);
        Assert.AreEqual(ModernizationWorkflow.EvolutionAgentName, executionOrder[1]);
    }

    [TestMethod]
    public void SquadGenerationStageUsesDedicatedAgentEvalTddGenerator()
    {
        var contract = ModernizationWorkflow.CreateContract();
        var squadStage = contract.Stages.Single(stage => stage.Id == "increment-area-squads");

        CollectionAssert.Contains(contract.RegisteredAgents.ToArray(), "khepri-squad-generator");
        CollectionAssert.Contains(squadStage.RequiredAgents.ToArray(), "khepri-squad-generator");
        Assert.IsTrue(squadStage.RequiredEvidence.Any(item => item.Contains("SDK-first squad", StringComparison.OrdinalIgnoreCase)));
        Assert.IsTrue(squadStage.RequiredEvidence.Any(item => item.Contains("generated AgentV scenarios", StringComparison.OrdinalIgnoreCase)));
        Assert.IsTrue(squadStage.RequiredEvidence.Any(item => item.Contains("evaluators", StringComparison.OrdinalIgnoreCase)));
        Assert.IsTrue(squadStage.RequiredEvidence.Any(item => item.Contains("test data", StringComparison.OrdinalIgnoreCase)));
        Assert.IsTrue(squadStage.RequiredEvidence.Any(item => item.Contains("squad member rubric", StringComparison.OrdinalIgnoreCase)));
        Assert.IsTrue(squadStage.RequiredEvidence.Any(item => item.Contains("multiple improvement loops", StringComparison.OrdinalIgnoreCase)));
        Assert.IsTrue(squadStage.RequiredEvidence.Any(item => item.Contains("live-evals", StringComparison.OrdinalIgnoreCase)));
        Assert.IsTrue(squadStage.RequiredEvidence.Any(item => item.Contains("steer too far", StringComparison.OrdinalIgnoreCase)));

        Assert.IsTrue(squadStage.RequiredAgentEvals.Any(eval => eval.Name == "squad-member-rubric" && eval.EvaluatorType == "llm_judge"));
        Assert.IsTrue(squadStage.RequiredAgentEvals.Any(eval => eval.Name == "rubric-live-eval" && eval.EvaluatorType == "live_eval"));
    }

    [TestMethod]
    public void ExecutionStageKeepsLegacyRegressionChecksInTheTddLoop()
    {
        var contract = ModernizationWorkflow.CreateContract();
        var executionStage = contract.Stages.Single(stage => stage.Id == "tdd-modernization-execution");

        Assert.IsTrue(executionStage.RequiredEvidence.Any(item => item.Contains("legacy regression", StringComparison.Ordinal)));
        Assert.IsTrue(executionStage.RequiredEvidence.Any(item => item.Contains("red/green/refactor", StringComparison.Ordinal)));
    }

    [TestMethod]
    public void KnowledgeAgentIsRequiredForQueryableLegacyTargetAndRefinementKnowledge()
    {
        var contract = ModernizationWorkflow.CreateContract();
        var legacyStage = contract.Stages.Single(stage => stage.Id == "legacy-requirements-specs-tests");
        var targetStage = contract.Stages.Single(stage => stage.Id == "target-requirements-specs-test-plans");
        var refinementStage = contract.Stages.Single(stage => stage.Id == "current-stage-plan-refinement");
        var executionStage = contract.Stages.Single(stage => stage.Id == "tdd-modernization-execution");

        CollectionAssert.Contains(legacyStage.RequiredAgents.ToArray(), ModernizationWorkflow.KnowledgeAgentName);
        CollectionAssert.Contains(targetStage.RequiredAgents.ToArray(), ModernizationWorkflow.KnowledgeAgentName);
        CollectionAssert.Contains(refinementStage.RequiredAgents.ToArray(), ModernizationWorkflow.KnowledgeAgentName);
        CollectionAssert.Contains(executionStage.RequiredAgents.ToArray(), ModernizationWorkflow.KnowledgeAgentName);

        Assert.IsTrue(legacyStage.RequiredEvidence.Any(item => item.Contains("queryable knowledge base", StringComparison.OrdinalIgnoreCase)));
        Assert.IsTrue(targetStage.RequiredEvidence.Any(item => item.Contains("queryable knowledge base", StringComparison.OrdinalIgnoreCase)));
        Assert.IsTrue(refinementStage.RequiredEvidence.Any(item => item.Contains("knowledge refinement", StringComparison.OrdinalIgnoreCase)));
        Assert.IsTrue(executionStage.RequiredEvidence.Any(item => item.Contains("knowledge refinement", StringComparison.OrdinalIgnoreCase)));
    }

    [TestMethod]
    public void GitHubCopilotRegistryPromptsKnowledgeAgentToModelQueryableKnowledgeBase()
    {
        var configs = GitHubCopilotModernizationAgentRegistry.CreateCustomAgentConfigs();
        var knowledgeAgent = configs.Single(config => config.Name == ModernizationWorkflow.KnowledgeAgentName);

        Assert.IsTrue(knowledgeAgent.Prompt?.Contains("queryable knowledge base", StringComparison.OrdinalIgnoreCase));
        Assert.IsTrue(knowledgeAgent.Prompt?.Contains("available knowledge-modeling capabilities", StringComparison.OrdinalIgnoreCase));
        Assert.IsTrue(knowledgeAgent.Prompt?.Contains("MCP", StringComparison.OrdinalIgnoreCase));
        Assert.IsTrue(knowledgeAgent.Prompt?.Contains("wiki", StringComparison.OrdinalIgnoreCase));
        Assert.IsTrue(knowledgeAgent.Prompt?.Contains("database", StringComparison.OrdinalIgnoreCase));
        Assert.IsTrue(knowledgeAgent.Prompt?.Contains("query smoke check", StringComparison.OrdinalIgnoreCase));
    }

    [TestMethod]
    public void GitHubCopilotRegistryRegistersDedicatedSquadGeneratorAgent()
    {
        var configs = GitHubCopilotModernizationAgentRegistry.CreateCustomAgentConfigs();
        var generator = configs.Single(config => config.Name == "khepri-squad-generator");

        CollectionAssert.Contains(generator.Tools?.ToArray(), "edit");
        CollectionAssert.Contains(generator.Tools?.ToArray(), "execute");
        CollectionAssert.Contains(generator.Tools?.ToArray(), "agent");
        Assert.IsTrue(generator.Prompt?.Contains("SDK-first squad", StringComparison.OrdinalIgnoreCase));
        Assert.IsTrue(generator.Prompt?.Contains("AgentEvals", StringComparison.OrdinalIgnoreCase));
        Assert.IsTrue(generator.Prompt?.Contains("evaluators", StringComparison.OrdinalIgnoreCase));
        Assert.IsTrue(generator.Prompt?.Contains("test data", StringComparison.OrdinalIgnoreCase));
        Assert.IsTrue(generator.Prompt?.Contains("squad members", StringComparison.OrdinalIgnoreCase));
        Assert.IsTrue(generator.Prompt?.Contains("rubric", StringComparison.OrdinalIgnoreCase));
        Assert.IsTrue(generator.Prompt?.Contains("live-evals", StringComparison.OrdinalIgnoreCase));
        Assert.IsTrue(generator.Prompt?.Contains("multiple improvement loops", StringComparison.OrdinalIgnoreCase));
        Assert.IsTrue(generator.Prompt?.Contains("steer too far", StringComparison.OrdinalIgnoreCase));
    }

    [TestMethod]
    public void GitHubCopilotRegistryRegistersEveryWorkflowAgent()
    {
        var requiredAgents = ModernizationWorkflow.CreateContract().RegisteredAgents;
        var configs = GitHubCopilotModernizationAgentRegistry.CreateCustomAgentConfigs();
        var configuredNames = configs.Select(config => config.Name).ToHashSet(StringComparer.Ordinal);
        var session = GitHubCopilotModernizationAgentRegistry.CreateSessionConfig(Environment.CurrentDirectory);

        Assert.IsTrue(requiredAgents.Contains(ModernizationWorkflow.ScaffoldAgentName));
        Assert.IsTrue(requiredAgents.All(configuredNames.Contains));
        Assert.AreEqual(ModernizationWorkflow.OrchestratorAgentName, session.Agent);
        Assert.IsTrue(session.IncludeSubAgentStreamingEvents);
        Assert.IsTrue(requiredAgents.All(agentName => session.CustomAgents?.Any(config => config.Name == agentName) == true));
    }

    [TestMethod]
    public void SecurityModernizationAgentIsRegisteredAndUsedByPlanningStages()
    {
        const string securityAgentName = "security-modernization";
        var contract = ModernizationWorkflow.CreateContract();
        var planningStages = contract.Stages
            .Where(stage => stage.Id is "incremental-modernization-plan" or "increment-area-squads" or "current-stage-plan-refinement")
            .ToArray();

        CollectionAssert.Contains(contract.RegisteredAgents.ToArray(), securityAgentName);
        foreach (var stage in planningStages)
        {
            CollectionAssert.Contains(stage.RequiredAgents.ToArray(), securityAgentName, $"{stage.Id} should use security modernization advice.");
            CollectionAssert.Contains(stage.Areas.Select(area => area.ToString()).ToArray(), "Security", $"{stage.Id} should treat security as a modernization area.");
        }
    }

    [TestMethod]
    public void GitHubCopilotRegistryPromptsSecurityModernizationAgentWithRiskAndRegressionGuidance()
    {
        var configs = GitHubCopilotModernizationAgentRegistry.CreateCustomAgentConfigs();
        var securityAgent = configs.SingleOrDefault(config => config.Name == "security-modernization");

        Assert.IsNotNull(securityAgent);
        Assert.IsTrue(securityAgent!.Prompt?.Contains("threat modeling", StringComparison.OrdinalIgnoreCase));
        Assert.IsTrue(securityAgent.Prompt?.Contains("identity and access", StringComparison.OrdinalIgnoreCase));
        Assert.IsTrue(securityAgent.Prompt?.Contains("secrets", StringComparison.OrdinalIgnoreCase));
        Assert.IsTrue(securityAgent.Prompt?.Contains("vulnerability", StringComparison.OrdinalIgnoreCase));
        Assert.IsTrue(securityAgent.Prompt?.Contains("security regression", StringComparison.OrdinalIgnoreCase));
        Assert.IsTrue(securityAgent.Prompt?.Contains("rollback", StringComparison.OrdinalIgnoreCase));
    }

    [TestMethod]
    public void GitHubCopilotRegistryPreloadsWorkflowAndArchitectureDocsSkills()
    {
        var session = GitHubCopilotModernizationAgentRegistry.CreateSessionConfig(Environment.CurrentDirectory);
        var orchestrator = session.CustomAgents?.Single(agent => agent.Name == ModernizationWorkflow.OrchestratorAgentName);
        var evolution = session.CustomAgents?.Single(agent => agent.Name == ModernizationWorkflow.EvolutionAgentName);

        Assert.IsNotNull(session.SkillDirectories);
        Assert.IsNotNull(orchestrator?.Skills);
        CollectionAssert.Contains(session.SkillDirectories?.ToArray(), ".github/skills");
        CollectionAssert.Contains(orchestrator?.Skills?.ToArray(), ModernizationWorkflow.WorkflowSkillName);
        CollectionAssert.Contains(orchestrator?.Skills?.ToArray(), ModernizationWorkflow.ArchitectureDocsSkillName);
        CollectionAssert.Contains(evolution?.Skills?.ToArray(), ModernizationWorkflow.ArchitectureDocsSkillName);
    }

    [TestMethod]
    public void ModernizationWorkflowSkillCallsTheDotnetWorkflowCode()
    {
        var repoRoot = FindRepoRoot();
        var skillPath = Path.Combine(repoRoot, ".github", "skills", "khepri-modernization-workflow", "SKILL.md");

        Assert.IsTrue(File.Exists(skillPath), "The modernization workflow should be exposed as a repo-local Agent Skill.");

        var skill = File.ReadAllText(skillPath);
        Assert.IsTrue(skill.Contains("name: khepri-modernization-workflow", StringComparison.Ordinal), "Skill name should match its folder.");
        Assert.IsTrue(skill.Contains("Use when", StringComparison.Ordinal), "Skill description should be trigger-focused.");
        Assert.IsTrue(skill.Contains("dotnet/src/Modernization/Workflow/ModernizationWorkflow.cs", StringComparison.Ordinal));
        Assert.IsTrue(skill.Contains("dotnet/src/Modernization/Workflow/GitHubCopilotModernizationAgentRegistry.cs", StringComparison.Ordinal));
        Assert.IsTrue(skill.Contains("ModernizationWorkflow.CreateContract", StringComparison.Ordinal));
        Assert.IsTrue(skill.Contains("ModernizationWorkflow.CreateAgentCallPlan", StringComparison.Ordinal));
        Assert.IsTrue(skill.Contains("BuildMicrosoftAgentFrameworkWorkflow", StringComparison.Ordinal));
        Assert.IsTrue(skill.Contains("dotnet test dotnet\\tests\\Code2\\NL\\Code2NL.Tests.csproj", StringComparison.Ordinal));
    }

    [TestMethod]
    public void PrimaryLegacyScenarioMatrixCoversCobolDotNetAndJavaEdgeCases()
    {
        var scenarios = ModernizationWorkflow.CreatePrimaryLegacyScenarioMatrix();

        CollectionAssert.AreEquivalent(
            new[] { LegacySystemKind.Cobol, LegacySystemKind.DotNetFramework, LegacySystemKind.JavaMonolith },
            scenarios.Select(scenario => scenario.Kind).ToArray());

        AssertScenarioContains(
            scenarios.Single(scenario => scenario.Kind == LegacySystemKind.Cobol),
            legacySignals: ["CICS/BMS screens", "JCL batch jobs", "copybooks", "VSAM or DB2 data", "fixed-width reports"],
            edgeCases: ["EBCDIC encoding", "packed decimals", "batch restart windows"],
            modernizationTests: ["copybook fixture tests", "batch replay", "report parity"]);

        AssertScenarioContains(
            scenarios.Single(scenario => scenario.Kind == LegacySystemKind.DotNetFramework),
            legacySignals: ["System.Web", "IIS", "WCF or ASMX endpoints", "Windows services", "ADO.NET SQL Server"],
            edgeCases: ["COM interop", "32-bit dependency", "machine.config"],
            modernizationTests: ["golden-master HTTP contracts", "service facade contract tests", "config parity"]);

        AssertScenarioContains(
            scenarios.Single(scenario => scenario.Kind == LegacySystemKind.JavaMonolith),
            legacySignals: ["Servlet/JSP", "EJB or JMS", "Ant or Maven", "application server descriptors", "JDBC or Hibernate"],
            edgeCases: ["transaction boundaries", "classloader resource lookup", "checked exception mapping"],
            modernizationTests: ["message replay", "API contract tests", "persistence parity"]);
    }

    [TestMethod]
    public void AtomicWorkflowStepContractsCoverEveryStageIndependently()
    {
        var stageIds = ModernizationWorkflow.CreateContract().Stages.Select(stage => stage.Id).ToArray();
        var atomicSteps = ModernizationWorkflow.CreateAtomicStepContracts();

        CollectionAssert.AreEqual(stageIds, atomicSteps.Select(step => step.StageId).ToArray());

        foreach (var step in atomicSteps)
        {
            Assert.IsFalse(string.IsNullOrWhiteSpace(step.SmallestUnit));
            Assert.IsTrue(step.RequiredInputs.Count > 0, $"{step.StageId} should define required inputs.");
            Assert.IsTrue(step.RequiredOutputs.Count > 0, $"{step.StageId} should define required outputs.");
            Assert.IsTrue(step.IndependentVerification.Count > 0, $"{step.StageId} should define independent verification.");
            Assert.IsTrue(step.RequiredAgents.Count > 0, $"{step.StageId} should define required agents.");
        }

        var legacyStep = atomicSteps.Single(step => step.StageId == "legacy-requirements-specs-tests");
        CollectionAssert.AreEquivalent(
            new[] { LegacySystemKind.Cobol, LegacySystemKind.DotNetFramework, LegacySystemKind.JavaMonolith },
            legacyStep.SupportedLegacyKinds.ToArray());

        var executionStep = atomicSteps.Single(step => step.StageId == "tdd-modernization-execution");
        Assert.IsTrue(executionStep.IndependentVerification.Any(check => check.Contains("verify red", StringComparison.OrdinalIgnoreCase)));
        Assert.IsTrue(executionStep.IndependentVerification.Any(check => check.Contains("verify green", StringComparison.OrdinalIgnoreCase)));
    }

    [TestMethod]
    public void AtomicSquadGenerationStepRequiresSdkRubricLiveEvalOutputs()
    {
        var atomicSteps = ModernizationWorkflow.CreateAtomicStepContracts();
        var squadStep = atomicSteps.Single(step => step.StageId == "increment-area-squads");

        CollectionAssert.Contains(squadStep.RequiredAgents.ToArray(), "khepri-squad-generator");
        Assert.IsTrue(squadStep.RequiredOutputs.Any(item => item.Contains("SDK-first squad config", StringComparison.OrdinalIgnoreCase)));
        Assert.IsTrue(squadStep.RequiredOutputs.Any(item => item.Contains("AgentV scenarios", StringComparison.OrdinalIgnoreCase)));
        Assert.IsTrue(squadStep.RequiredOutputs.Any(item => item.Contains("evaluators", StringComparison.OrdinalIgnoreCase)));
        Assert.IsTrue(squadStep.RequiredOutputs.Any(item => item.Contains("test data", StringComparison.OrdinalIgnoreCase)));
        Assert.IsTrue(squadStep.RequiredOutputs.Any(item => item.Contains("squad member rubric", StringComparison.OrdinalIgnoreCase)));
        Assert.IsTrue(squadStep.IndependentVerification.Any(check => check.Contains("live-evals", StringComparison.OrdinalIgnoreCase)));
        Assert.IsTrue(squadStep.IndependentVerification.Any(check => check.Contains("rubric adherence", StringComparison.OrdinalIgnoreCase)));
        Assert.IsTrue(squadStep.IndependentVerification.Any(check => check.Contains("multiple improvement loops", StringComparison.OrdinalIgnoreCase)));
    }

    [TestMethod]
    public void EveryPrimaryLegacyScenarioDefinesEveryAtomicFlowStep()
    {
        var stepIds = ModernizationWorkflow.CreateAtomicStepContracts().Select(step => step.StageId).ToArray();
        var scenarios = ModernizationWorkflow.CreatePrimaryLegacyScenarioMatrix();

        foreach (var scenario in scenarios)
        {
            CollectionAssert.AreEqual(stepIds, scenario.AtomicStepIds.ToArray(), scenario.Id);
            Assert.IsTrue(scenario.RegressionFixtureNames.Count >= 3, $"{scenario.Id} should include multiple regression fixtures.");
            Assert.IsTrue(scenario.TestModernizationScenarios.Any(test => test.Contains("parity", StringComparison.OrdinalIgnoreCase) || test.Contains("contract", StringComparison.OrdinalIgnoreCase)));
        }
    }

    [TestMethod]
    public void LegacySamplePacksExistForEveryPrimaryScenario()
    {
        var packs = ModernizationWorkflow.CreateLegacySamplePacks();
        var scenarioIds = ModernizationWorkflow.CreatePrimaryLegacyScenarioMatrix().Select(scenario => scenario.Id).ToArray();
        var repoRoot = FindRepoRoot();

        CollectionAssert.AreEquivalent(scenarioIds, packs.Select(pack => pack.ScenarioId).ToArray());

        foreach (var pack in packs)
        {
            Assert.IsFalse(string.IsNullOrWhiteSpace(pack.RootRelativePath), $"{pack.ScenarioId} should have a sample root.");
            Assert.IsTrue(Directory.Exists(Path.Combine(repoRoot, pack.RootRelativePath)), $"{pack.ScenarioId} sample root should exist.");
            Assert.IsTrue(pack.SampleRelativePaths.Count >= 4, $"{pack.ScenarioId} should include multiple sample artifacts.");
            Assert.IsTrue(pack.RequiredEdgeCaseFixtures.Count >= 3, $"{pack.ScenarioId} should include multiple edge-case fixtures.");
            Assert.IsTrue(pack.ReplayCommands.Count > 0, $"{pack.ScenarioId} should describe replay commands.");

            foreach (var samplePath in pack.SampleRelativePaths)
            {
                Assert.IsTrue(File.Exists(Path.Combine(repoRoot, samplePath)), $"{pack.ScenarioId} sample file missing: {samplePath}");
            }
        }
    }

    [TestMethod]
    public void LegacySamplePacksPreserveConcreteScenarioFixtures()
    {
        var packs = ModernizationWorkflow.CreateLegacySamplePacks();

        AssertPackContains(
            packs.Single(pack => pack.Kind == LegacySystemKind.Cobol),
            samplePaths: ["CUSTOMER.CPY", "ELIGBLTY.CBL", "nightly-eligibility.jcl", "eligibility-records.fixed", "eligibility-report.txt"],
            fixtureTerms: ["EBCDIC", "packed decimal", "restart checkpoint"]);

        AssertPackContains(
            packs.Single(pack => pack.Kind == LegacySystemKind.DotNetFramework),
            samplePaths: ["ClaimsController.cs", "ClaimsService.svc", "ClaimSweepService.cs", "web.config", "http-golden-master.json"],
            fixtureTerms: ["COM interop", "32-bit", "machine.config"]);

        AssertPackContains(
            packs.Single(pack => pack.Kind == LegacySystemKind.JavaMonolith),
            samplePaths: ["PaymentServlet.java", "PaymentMDB.java", "PaymentDao.java", "web.xml", "jms-replay.jsonl"],
            fixtureTerms: ["JMS replay", "transaction boundary", "classloader resource"]);
    }

    private static void AssertScenarioContains(
        LegacyModernizationScenario scenario,
        string[] legacySignals,
        string[] edgeCases,
        string[] modernizationTests)
    {
        AssertAllPresent(scenario.LegacySignals, legacySignals, scenario.Id);
        AssertAllPresent(scenario.EdgeCases, edgeCases, scenario.Id);
        AssertAllPresent(scenario.TestModernizationScenarios, modernizationTests, scenario.Id);
    }

    private static void AssertAllPresent(IReadOnlyList<string> actual, string[] expected, string scenarioId)
    {
        foreach (var expectedItem in expected)
        {
            Assert.IsTrue(
                actual.Any(item => item.Contains(expectedItem, StringComparison.OrdinalIgnoreCase)),
                $"{scenarioId} should include '{expectedItem}'. Actual: {string.Join(", ", actual)}");
        }
    }

    private static void AssertPackContains(LegacySamplePack pack, string[] samplePaths, string[] fixtureTerms)
    {
        AssertAllPresent(pack.SampleRelativePaths, samplePaths, pack.ScenarioId);
        AssertAllPresent(pack.RequiredEdgeCaseFixtures, fixtureTerms, pack.ScenarioId);
    }

    private static string FindRepoRoot()
    {
        var current = new DirectoryInfo(Environment.CurrentDirectory);
        while (current is not null)
        {
            if (File.Exists(Path.Combine(current.FullName, "package.json")) &&
                Directory.Exists(Path.Combine(current.FullName, "dotnet")))
            {
                return current.FullName;
            }

            current = current.Parent;
        }

        Assert.Fail($"Could not locate repository root from {Environment.CurrentDirectory}");
        return Environment.CurrentDirectory;
    }
}
