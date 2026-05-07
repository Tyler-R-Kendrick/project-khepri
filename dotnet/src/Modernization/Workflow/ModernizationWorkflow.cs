using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Workflows;
using Microsoft.Extensions.AI;
using AgentFrameworkWorkflow = Microsoft.Agents.AI.Workflows.Workflow;

namespace Khepri.Modernization.Workflow;

public enum ModernizationArea
{
    App,
    Data,
    Infra
}

public enum LegacySystemKind
{
    Cobol,
    DotNetFramework,
    JavaMonolith
}

public sealed record ModernizationWorkflowContract(
    string Name,
    IReadOnlyList<string> RegisteredAgents,
    IReadOnlyList<ModernizationWorkflowStage> Stages);

public sealed record ModernizationWorkflowStage(
    string Id,
    string Purpose,
    IReadOnlyList<string> RequiredAgents,
    IReadOnlyList<ModernizationArea> Areas,
    IReadOnlyList<string> RequiredEvidence)
{
    public IReadOnlyList<AgentEvalRequirement> RequiredAgentEvals { get; init; } = [];
}

public sealed record AgentEvalRequirement(
    string Name,
    string EvaluatorType,
    string Purpose);

public sealed record AtomicModernizationStepContract(
    string StageId,
    string SmallestUnit,
    IReadOnlyList<string> RequiredInputs,
    IReadOnlyList<string> RequiredOutputs,
    IReadOnlyList<string> RequiredAgents,
    IReadOnlyList<string> IndependentVerification,
    IReadOnlyList<LegacySystemKind> SupportedLegacyKinds);

public sealed record LegacyModernizationScenario(
    string Id,
    LegacySystemKind Kind,
    string Description,
    IReadOnlyList<string> LegacySignals,
    IReadOnlyList<string> EdgeCases,
    IReadOnlyList<string> RegressionFixtureNames,
    IReadOnlyList<string> TestModernizationScenarios,
    IReadOnlyList<string> AtomicStepIds);

public sealed record LegacySamplePack(
    string ScenarioId,
    LegacySystemKind Kind,
    string RootRelativePath,
    IReadOnlyList<string> SampleRelativePaths,
    IReadOnlyList<string> RequiredEdgeCaseFixtures,
    IReadOnlyList<string> ReplayCommands);

public static class ModernizationWorkflow
{
    public const string WorkflowSkillName = "khepri-modernization-workflow";
    public const string OrchestratorAgentName = "khepri-orchestrator";
    public const string SpecAgentName = "khepri-spec";
    public const string KnowledgeAgentName = "khepri-knowledge";
    public const string PlannerAgentName = "khepri-planner";
    public const string ScaffoldAgentName = "khepri-scaffold";
    public const string CodeAgentName = "khepri-code";
    public const string TestAgentName = "khepri-test";
    public const string AssessorAgentName = "khepri-modernization-assessor";
    public const string EvolutionAgentName = "khepri-evolution";
    public const string AppModernizationAgentName = "app-modernization";
    public const string DataModernizationAgentName = "data-modernization";
    public const string InfraModernizationAgentName = "infra-modernization";

    private static readonly string[] RegisteredAgentNames =
    [
        OrchestratorAgentName,
        SpecAgentName,
        KnowledgeAgentName,
        PlannerAgentName,
        ScaffoldAgentName,
        CodeAgentName,
        TestAgentName,
        AssessorAgentName,
        EvolutionAgentName,
        AppModernizationAgentName,
        DataModernizationAgentName,
        InfraModernizationAgentName
    ];

    private static readonly string[] SequentialAgentOrder =
    [
        OrchestratorAgentName,
        EvolutionAgentName,
        SpecAgentName,
        KnowledgeAgentName,
        PlannerAgentName,
        ScaffoldAgentName,
        CodeAgentName,
        TestAgentName,
        AssessorAgentName
    ];

    private static readonly string[] AreaModernizationAgents =
    [
        AppModernizationAgentName,
        DataModernizationAgentName,
        InfraModernizationAgentName
    ];

    public static ModernizationWorkflowContract CreateContract()
    {
        return new ModernizationWorkflowContract(
            "khepri-maf-ghcp-incremental-modernization",
            RegisteredAgentNames,
            [
                new ModernizationWorkflowStage(
                    "legacy-requirements-specs-tests",
                    "Generate or extract requirements, specifications, and executable tests from existing legacy systems before target work begins.",
                    [SpecAgentName, KnowledgeAgentName, TestAgentName],
                    [],
                    ["source evidence", "legacy behavior inventory", "legacy regression seed tests"]),
                new ModernizationWorkflowStage(
                    "target-requirements-specs-test-plans",
                    "Generate or extract requirements, specifications, and test plans from target desired state systems and standards.",
                    [SpecAgentName, KnowledgeAgentName, PlannerAgentName],
                    [],
                    ["target desired state evidence", "acceptance criteria", "test-PLANS"]),
                new ModernizationWorkflowStage(
                    "incremental-modernization-plan",
                    "Generate the high-level incremental modernization plan from the legacy and target specs.",
                    [PlannerAgentName, AppModernizationAgentName, DataModernizationAgentName, InfraModernizationAgentName],
                    [ModernizationArea.App, ModernizationArea.Data, ModernizationArea.Infra],
                    ["increment map", "area risks", "approval checkpoints"]),
                new ModernizationWorkflowStage(
                    "increment-area-squads",
                    "Generate specialized app, data, and infra squads for each increment and require AgentEvals from agentevals.io before implementation.",
                    [AppModernizationAgentName, DataModernizationAgentName, InfraModernizationAgentName, CodeAgentName, TestAgentName],
                    [ModernizationArea.App, ModernizationArea.Data, ModernizationArea.Infra],
                    ["AgentEvals", "agentevals.io", "tool-calling evaluator", "relevance evaluator"])
                {
                    RequiredAgentEvals =
                    [
                        new AgentEvalRequirement(
                            "tool-calling",
                            "tool_trajectory",
                            "Proves generated squads call the required modernization agents, tools, and handoffs in the intended order."),
                        new AgentEvalRequirement(
                            "relevance",
                            "llm_judge",
                            "Proves generated squad recommendations stay relevant to the active increment, legacy behavior, and target desired state.")
                    ]
                },
                new ModernizationWorkflowStage(
                    "current-stage-plan-refinement",
                    "Use the generated squads to refine a detailed modernization plan for the current stage.",
                    [PlannerAgentName, AppModernizationAgentName, DataModernizationAgentName, InfraModernizationAgentName],
                    [ModernizationArea.App, ModernizationArea.Data, ModernizationArea.Infra],
                    ["stage-ready plan", "dependencies", "rollback plan", "regression gates"]),
                new ModernizationWorkflowStage(
                    "tdd-modernization-execution",
                    "Act on the current stage plan with TDD, keeping legacy regression checks central to every red/green/refactor loop.",
                    [CodeAgentName, TestAgentName, AssessorAgentName],
                    [ModernizationArea.App, ModernizationArea.Data, ModernizationArea.Infra],
                    ["legacy regression checks", "red/green/refactor evidence", "AgentEvals rerun", "acceptance evidence"])
            ]);
    }

    public static IReadOnlyList<AtomicModernizationStepContract> CreateAtomicStepContracts()
    {
        var stages = CreateContract().Stages.ToDictionary(stage => stage.Id, StringComparer.Ordinal);
        return
        [
            CreateAtomicStep(
                stages["legacy-requirements-specs-tests"],
                "Smallest unit: one legacy behavior slice with source files, runtime path, and regression seed tests; this step is independent and must not depend on target planning.",
                ["legacy source location", "runtime or emulator command", "business behavior question", "known production sample"],
                ["source-backed requirements", "spec fragments", "legacy regression seed tests", "unsupported assumptions list"],
                ["source-backed behavior inventory", "generated regression seed tests", "unsupported assumptions list"],
                [LegacySystemKind.Cobol, LegacySystemKind.DotNetFramework, LegacySystemKind.JavaMonolith]),
            CreateAtomicStep(
                stages["target-requirements-specs-test-plans"],
                "Smallest unit: one target desired-state capability mapped to legacy evidence and explicit test-PLANS without implementation changes.",
                ["approved legacy behavior slice", "target standards or reference system", "nonfunctional constraints"],
                ["target requirements", "target specs", "test-PLANS", "acceptance criteria"],
                ["target source evidence", "acceptance criteria", "test-PLANS"],
                [LegacySystemKind.Cobol, LegacySystemKind.DotNetFramework, LegacySystemKind.JavaMonolith]),
            CreateAtomicStep(
                stages["incremental-modernization-plan"],
                "Smallest unit: one independently approvable increment across app, data, and infra areas with risk sequencing and rollback checkpoints.",
                ["legacy specs", "target specs", "test plans", "area modernization advice"],
                ["increment map", "app/data/infra risk sequencing", "approval checkpoints"],
                ["planner evidence trace", "area risks", "approval checkpoints"],
                [LegacySystemKind.Cobol, LegacySystemKind.DotNetFramework, LegacySystemKind.JavaMonolith]),
            CreateAtomicStep(
                stages["increment-area-squads"],
                "Smallest unit: one generated app/data/infra squad set for a single increment, blocked on AgentEvals before implementation.",
                ["increment scope", "legacy regression gates", "target test plans"],
                ["app squad plan", "data squad plan", "infra squad plan", "tool_trajectory and llm_judge eval gates"],
                ["tool_trajectory", "llm_judge", "AgentEvals pass before implementation"],
                [LegacySystemKind.Cobol, LegacySystemKind.DotNetFramework, LegacySystemKind.JavaMonolith]),
            CreateAtomicStep(
                stages["current-stage-plan-refinement"],
                "Smallest unit: one stage-ready plan for the current increment with dependencies, rollback plan, and regression gates.",
                ["squad outputs", "increment constraints", "legacy parity gates"],
                ["stage-ready plan", "dependencies", "rollback plan", "regression gates"],
                ["dependency check", "rollback plan review", "regression gates"],
                [LegacySystemKind.Cobol, LegacySystemKind.DotNetFramework, LegacySystemKind.JavaMonolith]),
            CreateAtomicStep(
                stages["tdd-modernization-execution"],
                "Smallest unit: one behavior-preserving code change driven by a legacy regression red signal and accepted only after green verification.",
                ["stage-ready plan", "legacy regression fixture", "target test plan"],
                ["minimal implementation", "red/green/refactor evidence", "AgentEvals rerun", "assessor acceptance evidence"],
                ["legacy regression checks", "verify red", "verify green", "AgentEvals rerun", "assessor acceptance"],
                [LegacySystemKind.Cobol, LegacySystemKind.DotNetFramework, LegacySystemKind.JavaMonolith])
        ];
    }

    public static IReadOnlyList<LegacyModernizationScenario> CreatePrimaryLegacyScenarioMatrix()
    {
        var stepIds = CreateAtomicStepContracts().Select(step => step.StageId).ToArray();
        return
        [
            new LegacyModernizationScenario(
                "cobol-claims-batch-and-cics",
                LegacySystemKind.Cobol,
                "COBOL claims platform with CICS/BMS screens, JCL batch jobs, copybooks, VSAM or DB2 data, and fixed-width reports.",
                ["CICS/BMS screens", "JCL batch jobs", "copybooks", "VSAM or DB2 data", "fixed-width reports"],
                ["EBCDIC encoding", "packed decimals", "batch restart windows", "sort order and rounding drift"],
                ["copybook-fixtures", "batch-replay-fixtures", "fixed-width-report-golden-master"],
                ["copybook fixture tests", "batch replay", "report parity", "packed decimal conversion tests", "restart/retry semantics"],
                stepIds),
            new LegacyModernizationScenario(
                "dotnet-framework-claims-portal",
                LegacySystemKind.DotNetFramework,
                "Legacy .NET Framework estate with System.Web on IIS, WCF or ASMX endpoints, Windows services, and ADO.NET SQL Server access.",
                ["System.Web", "IIS", "WebForms/MVC routes", "WCF or ASMX endpoints", "Windows services", "ADO.NET SQL Server"],
                ["COM interop", "32-bit dependency", "machine.config/app.config drift", "GAC assembly binding redirects"],
                ["http-golden-master-fixtures", "service-facade-contract-fixtures", "configuration-parity-fixtures"],
                ["golden-master HTTP contracts", "service facade contract tests", "config parity", "WCF/ASMX facade tests", "Windows service scheduling parity"],
                stepIds),
            new LegacyModernizationScenario(
                "java-payment-monolith",
                LegacySystemKind.JavaMonolith,
                "Legacy Java monolith with Servlet/JSP or Struts screens, EJB or JMS flows, application server descriptors, and JDBC or Hibernate persistence.",
                ["Servlet/JSP", "Struts", "EJB or JMS", "Ant or Maven", "application server descriptors", "JDBC or Hibernate"],
                ["transaction boundaries", "classloader resource lookup", "checked exception mapping", "JNDI and descriptor drift"],
                ["message-replay-fixtures", "api-contract-fixtures", "persistence-parity-fixtures"],
                ["message replay", "API contract tests", "persistence parity", "transaction-boundary tests", "descriptor parity", "checked-exception mapping tests"],
                stepIds)
        ];
    }

    public static IReadOnlyList<LegacySamplePack> CreateLegacySamplePacks()
    {
        return
        [
            new LegacySamplePack(
                "cobol-claims-batch-and-cics",
                LegacySystemKind.Cobol,
                "evals/legacy-samples/cobol-claims",
                [
                    "evals/legacy-samples/cobol-claims/copybooks/CUSTOMER.CPY",
                    "evals/legacy-samples/cobol-claims/programs/ELIGBLTY.CBL",
                    "evals/legacy-samples/cobol-claims/jcl/nightly-eligibility.jcl",
                    "evals/legacy-samples/cobol-claims/fixtures/eligibility-records.fixed",
                    "evals/legacy-samples/cobol-claims/expected/eligibility-report.txt",
                    "evals/legacy-samples/cobol-claims/scenario.json"
                ],
                ["EBCDIC", "packed decimal", "restart checkpoint"],
                ["Replay `fixtures/eligibility-records.fixed` through `programs/ELIGBLTY.CBL` and compare `expected/eligibility-report.txt` for report parity."]),
            new LegacySamplePack(
                "dotnet-framework-claims-portal",
                LegacySystemKind.DotNetFramework,
                "evals/legacy-samples/dotnet-framework-claims-portal",
                [
                    "evals/legacy-samples/dotnet-framework-claims-portal/src/ClaimsController.cs",
                    "evals/legacy-samples/dotnet-framework-claims-portal/src/ClaimsService.svc",
                    "evals/legacy-samples/dotnet-framework-claims-portal/src/ClaimSweepService.cs",
                    "evals/legacy-samples/dotnet-framework-claims-portal/config/web.config",
                    "evals/legacy-samples/dotnet-framework-claims-portal/fixtures/http-golden-master.json",
                    "evals/legacy-samples/dotnet-framework-claims-portal/scenario.json"
                ],
                ["COM interop", "32-bit", "machine.config"],
                ["Replay `fixtures/http-golden-master.json` against the target facade and compare route, status, payload, scheduling, and config parity."]),
            new LegacySamplePack(
                "java-payment-monolith",
                LegacySystemKind.JavaMonolith,
                "evals/legacy-samples/java-payment-monolith",
                [
                    "evals/legacy-samples/java-payment-monolith/src/PaymentServlet.java",
                    "evals/legacy-samples/java-payment-monolith/src/PaymentMDB.java",
                    "evals/legacy-samples/java-payment-monolith/src/PaymentDao.java",
                    "evals/legacy-samples/java-payment-monolith/config/web.xml",
                    "evals/legacy-samples/java-payment-monolith/fixtures/jms-replay.jsonl",
                    "evals/legacy-samples/java-payment-monolith/scenario.json"
                ],
                ["JMS replay", "transaction boundary", "classloader resource"],
                ["Replay `fixtures/jms-replay.jsonl` through the target adapter and compare API contract, transaction boundary, exception mapping, and persistence parity."])
        ];
    }

    public static AgentFrameworkWorkflow BuildMicrosoftAgentFrameworkWorkflow(IReadOnlyDictionary<string, AIAgent> registeredAgents)
    {
        ArgumentNullException.ThrowIfNull(registeredAgents);
        return AgentWorkflowBuilder.BuildSequential(
            "khepri-incremental-modernization",
            SelectAgents(registeredAgents, SequentialAgentOrder));
    }

    public static AgentFrameworkWorkflow BuildIncrementSquadWorkflow(string incrementId, IReadOnlyDictionary<string, AIAgent> registeredAgents)
    {
        if (string.IsNullOrWhiteSpace(incrementId))
        {
            throw new ArgumentException("Increment id is required.", nameof(incrementId));
        }

        ArgumentNullException.ThrowIfNull(registeredAgents);
        return AgentWorkflowBuilder.BuildConcurrent(
            $"khepri-{incrementId}-area-squads",
            SelectAgents(registeredAgents, AreaModernizationAgents),
            AggregateSquadMessages);
    }

    public static void EnsureRequiredAgentsRegistered(IReadOnlyDictionary<string, AIAgent> registeredAgents)
    {
        ArgumentNullException.ThrowIfNull(registeredAgents);
        var missing = RegisteredAgentNames
            .Where(agentName => !registeredAgents.ContainsKey(agentName))
            .ToArray();
        if (missing.Length > 0)
        {
            throw new InvalidOperationException($"Missing registered modernization agents: {string.Join(", ", missing)}");
        }
    }

    private static IEnumerable<AIAgent> SelectAgents(IReadOnlyDictionary<string, AIAgent> registeredAgents, IEnumerable<string> agentNames)
    {
        foreach (var agentName in agentNames)
        {
            if (!registeredAgents.TryGetValue(agentName, out var agent))
            {
                throw new InvalidOperationException($"Registered agent '{agentName}' is required by the modernization workflow.");
            }

            yield return agent;
        }
    }

    private static List<ChatMessage> AggregateSquadMessages(IList<List<ChatMessage>> squadOutputs)
    {
        return squadOutputs.SelectMany(messages => messages).ToList();
    }

    private static AtomicModernizationStepContract CreateAtomicStep(
        ModernizationWorkflowStage stage,
        string smallestUnit,
        IReadOnlyList<string> requiredInputs,
        IReadOnlyList<string> requiredOutputs,
        IReadOnlyList<string> independentVerification,
        IReadOnlyList<LegacySystemKind> supportedLegacyKinds)
    {
        return new AtomicModernizationStepContract(
            stage.Id,
            smallestUnit,
            requiredInputs,
            requiredOutputs,
            stage.RequiredAgents,
            independentVerification,
            supportedLegacyKinds);
    }
}
