import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import {
  ArrowUp,
  Bot,
  Boxes,
  BrainCircuit,
  ChevronDown,
  CircleDot,
  Code2,
  Database,
  FileText,
  GitBranch,
  Home,
  Menu,
  Mic,
  Network,
  PanelRight,
  PlayCircle,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  TestTube2,
  Workflow,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type AgentStatus = "idle" | "active" | "done" | "pending" | "blocked";

type AgentNode = {
  id: string;
  name: string;
  shortName: string;
  role: string;
  status: AgentStatus;
  state: string;
  detail: string;
  x: number;
  y: number;
};

type FlowEdge = {
  from: string;
  to: string;
  label: string;
  active: boolean;
};

type HostStatus = {
  mode: "checking" | "copilot" | "offline";
  label: string;
};

const promptSuggestions = [
  "Map this repo into a phased modernization workflow",
  "Generate an app/data/infra squad for the next increment",
  "Explain which Khepri agents will run for this request",
  "Start a TDD modernization plan with legacy regression gates",
];

const baseAgents: AgentNode[] = [
  {
    id: "orchestrator",
    name: "Orchestrator",
    shortName: "Khepri",
    role: "Receives request and opens the run",
    status: "idle",
    state: "Awaiting prompt",
    detail: "No active run yet.",
    x: 8,
    y: 18,
  },
  {
    id: "spec",
    name: "Spec Agent",
    shortName: "Spec",
    role: "Requirements, specs, tests",
    status: "pending",
    state: "Pending",
    detail: "Ready to normalize legacy and target evidence.",
    x: 28,
    y: 18,
  },
  {
    id: "knowledge",
    name: "Knowledge Agent",
    shortName: "Knowledge",
    role: "Queryable repo context",
    status: "pending",
    state: "Pending",
    detail: "Will model source, architecture, and evidence.",
    x: 50,
    y: 18,
  },
  {
    id: "planner",
    name: "Planner Agent",
    shortName: "Planner",
    role: "Increment and gates",
    status: "pending",
    state: "Pending",
    detail: "Will route work to focused modernization agents.",
    x: 72,
    y: 18,
  },
  {
    id: "advisors",
    name: "Domain Advisors",
    shortName: "Advisors",
    role: "App, data, infra, security",
    status: "pending",
    state: "Pending",
    detail: "Area specialists review patterns, risks, and rollback.",
    x: 92,
    y: 38,
  },
  {
    id: "scaffold",
    name: "Scaffold Agent",
    shortName: "Scaffold",
    role: "Target seams",
    status: "pending",
    state: "Pending",
    detail: "Creates minimal structure for the approved increment.",
    x: 72,
    y: 58,
  },
  {
    id: "code",
    name: "Code Agent",
    shortName: "Code",
    role: "Implementation",
    status: "pending",
    state: "Pending",
    detail: "Applies behavior-first changes with tight diffs.",
    x: 50,
    y: 74,
  },
  {
    id: "test",
    name: "Test Agent",
    shortName: "Test",
    role: "Gates and evidence",
    status: "pending",
    state: "Pending",
    detail: "Runs tests, evals, and legacy regression checks.",
    x: 28,
    y: 74,
  },
  {
    id: "assessor",
    name: "Assessor Agent",
    shortName: "Assessor",
    role: "Parity and risk",
    status: "pending",
    state: "Pending",
    detail: "Summarizes acceptance evidence and gaps.",
    x: 8,
    y: 58,
  },
  {
    id: "evolution",
    name: "Evolution Agent",
    shortName: "Evolution",
    role: "Continuous improvement",
    status: "pending",
    state: "Pending",
    detail: "Captures learnings and proposes workflow improvements.",
    x: 8,
    y: 38,
  },
];

const iconById = {
  orchestrator: Bot,
  spec: FileText,
  knowledge: Database,
  planner: Network,
  advisors: Boxes,
  scaffold: GitBranch,
  code: Code2,
  test: TestTube2,
  assessor: ShieldCheck,
  evolution: RefreshCw,
} satisfies Record<string, typeof Bot>;

function seededAgents(activeIndex: number, prompt: string): AgentNode[] {
  return baseAgents.map((agent, index) => {
    if (index < activeIndex) {
      return {
        ...agent,
        status: "done",
        state: "Done",
        detail:
          index === 0
            ? `Run created for: ${prompt.slice(0, 80) || "Khepri modernization prompt"}`
            : completionDetails[agent.id] ?? agent.detail,
      };
    }
    if (index === activeIndex) {
      return {
        ...agent,
        status: "active",
        state: "Active",
        detail: activeDetails[agent.id] ?? agent.detail,
      };
    }
    return { ...agent, status: index === 0 ? "idle" : "pending", state: index === 0 ? "Ready" : "Pending" };
  });
}

const activeDetails: Record<string, string> = {
  orchestrator: "Registering run state and handing the prompt to the spec lane.",
  spec: "Extracting modernization intent, acceptance criteria, and test signals.",
  knowledge: "Collecting repo context, architecture docs, and reusable evidence.",
  planner: "Creating increment boundaries, confidence gates, and owner routing.",
  advisors: "Splitting app, data, infra, and security risk recommendations.",
  scaffold: "Preparing minimal target seams and configuration surfaces.",
  code: "Implementing the approved slice through the red/green loop.",
  test: "Running deterministic tests, eval gates, and regression checks.",
  assessor: "Checking parity, unresolved risks, and acceptance evidence.",
  evolution: "Capturing feedback for the next workflow improvement cycle.",
};

const completionDetails: Record<string, string> = {
  spec: "Requirements, specs, and test expectations normalized.",
  knowledge: "Repository context modeled for later agent queries.",
  planner: "Plan created with staged validation and rollback points.",
  advisors: "Area-specific patterns, risks, and handoffs attached.",
  scaffold: "Target structure and configuration ready for implementation.",
  code: "Implementation lane completed for the current increment.",
  test: "Verification gates captured with reproducible evidence.",
  assessor: "Acceptance summary and residual risk report produced.",
  evolution: "Learning loop updated for future modernization runs.",
};

function makeEdges(agents: AgentNode[]): FlowEdge[] {
  const order = agents.map((agent) => agent.id);
  return order.slice(0, -1).map((id, index) => ({
    from: id,
    to: order[index + 1]!,
    label: index < 3 ? "message" : index < 7 ? "state" : "evidence",
    active: agents[index]?.status === "done" || agents[index + 1]?.status === "active",
  }));
}

function useHostStatus(): HostStatus {
  const [status, setStatus] = useState<HostStatus>({ mode: "checking", label: "Checking" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((response) => response.json())
      .then((data: { mode?: string }) => {
        if (cancelled) return;
        setStatus(data.mode === "copilot" ? { mode: "copilot", label: "Local" } : { mode: "offline", label: "Offline" });
      })
      .catch(() => {
        if (!cancelled) setStatus({ mode: "offline", label: "Offline" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}

export function App() {
  const hostStatus = useHostStatus();
  const [input, setInput] = useState(
    () =>
      localStorage.getItem("khepri:draft") ??
      "Create a modernization workflow for this repository and show which Khepri agents should coordinate the first increment.",
  );
  const [activeIndex, setActiveIndex] = useState(() => Number(localStorage.getItem("khepri:activeIndex") ?? 0));
  const [lastPrompt, setLastPrompt] = useState(() => localStorage.getItem("khepri:lastPrompt") ?? "");

  const { messages, sendMessage, status } = useChat({
    transport: new TextStreamChatTransport({ api: "/api/chat" }),
  });

  const isRunning = status === "submitted" || status === "streaming";
  const isProgressing = Boolean(lastPrompt) && activeIndex < baseAgents.length - 1;
  const agents = useMemo(() => seededAgents(activeIndex, lastPrompt), [activeIndex, lastPrompt]);
  const edges = useMemo(() => makeEdges(agents), [agents]);
  const progress = Math.min(100, Math.round((activeIndex / (agents.length - 1)) * 100));

  useEffect(() => {
    localStorage.setItem("khepri:draft", input);
  }, [input]);

  useEffect(() => {
    localStorage.setItem("khepri:activeIndex", String(activeIndex));
  }, [activeIndex]);

  useEffect(() => {
    localStorage.setItem("khepri:lastPrompt", lastPrompt);
  }, [lastPrompt]);

  useEffect(() => {
    if (!isRunning && !isProgressing) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => Math.min(baseAgents.length - 1, current + 1));
    }, 1200);
    return () => window.clearInterval(timer);
  }, [isRunning, isProgressing]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isRunning) return;
    setLastPrompt(text);
    setActiveIndex(0);
    void sendMessage({ text });
  }

  function resetRun() {
    setActiveIndex(0);
    setLastPrompt("");
  }

  return (
    <main className="app-shell">
      <header className="topbar" aria-label="Khepri navigation">
        <button className="icon-button" aria-label="Open navigation">
          <Menu size={24} />
        </button>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Bot size={23} />
          </span>
          <span>Khepri</span>
          <span className={`status-dot ${hostStatus.mode}`} />
          <span className="status-label">{hostStatus.label}</span>
        </div>
        <button className="icon-button" aria-label="Toggle inspector">
          <PanelRight size={21} />
        </button>
      </header>

      <section className="kickoff" aria-labelledby="kickoff-title">
        <h1 id="kickoff-title">What should we modernize with Khepri?</h1>
        <p>Describe the work. Khepri will orchestrate agents, manage state, and stream the result.</p>

        <form className="composer" onSubmit={submit}>
          <label className="sr-only" htmlFor="prompt">
            Khepri prompt
          </label>
          <textarea
            id="prompt"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={6}
            placeholder="Ask Khepri to modernize a legacy system, generate a squad, or run an evidence-backed plan..."
          />
          <div className="composer-actions">
            <button className="context-button" type="button">
              <Plus size={19} />
              <span>Add context</span>
            </button>
            <div className="composer-controls">
              <button className="select-button" type="button">
                <GitBranch size={18} />
                <span>main</span>
                <ChevronDown size={16} />
              </button>
              <button className="select-button" type="button">
                <Zap size={18} />
                <span>Full access</span>
                <ChevronDown size={16} />
              </button>
            </div>
            <div className="composer-right">
              <button className="select-button model" type="button">
                <span>gpt-5</span>
                <ChevronDown size={16} />
              </button>
              <button className="mic-button" type="button" aria-label="Use microphone">
                <Mic size={22} />
              </button>
              <button className="send-button" type="submit" aria-label="Start Khepri workflow" disabled={!input.trim() || isRunning}>
                <ArrowUp size={24} />
              </button>
            </div>
          </div>
        </form>

        <div className="suggestions" aria-label="Starter prompts">
          {promptSuggestions.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => setInput(suggestion)}>
              <Workflow size={18} />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="workflow-panel" aria-labelledby="workflow-title">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">
              <Zap size={18} />
              Workflow Overview
            </span>
            <h2 id="workflow-title">State and message flow</h2>
          </div>
          <div className="run-state">
            <CircleDot size={15} />
            <span>{isRunning || isProgressing ? "Running" : activeIndex > 0 ? "Idle" : "Ready"}</span>
          </div>
        </div>

        <WorkflowGraph agents={agents} edges={edges} />
        <div className="progress-track" aria-label={`Workflow progress ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="timeline-panel" aria-labelledby="timeline-title">
        <div className="panel-heading compact">
          <div className="tabs" role="tablist" aria-label="Workflow views">
            <button className="active" type="button" role="tab" aria-selected="true">
              Timeline
            </button>
            <button type="button" role="tab" aria-selected="false">
              Graph
            </button>
          </div>
          <label className="auto-scroll">
            Auto-scroll
            <input type="checkbox" defaultChecked />
          </label>
        </div>

        <div className="timeline" id="timeline-title">
          {agents.map((agent, index) => (
            <TimelineRow key={agent.id} agent={agent} index={index} />
          ))}
        </div>
      </section>

      <section className="chat-panel" aria-label="Copilot stream">
        <div className="panel-heading compact">
          <span className="section-kicker">
            <BrainCircuit size={18} />
            Copilot Stream
          </span>
          <button className="quiet-button" type="button" onClick={resetRun}>
            Reset
          </button>
        </div>
        <div className="messages">
          {messages.length === 0 ? (
            <p className="empty-message">Run a prompt to stream the Copilot-backed Khepri response here. Offline runs still update the graph.</p>
          ) : (
            messages.map((message) => (
              <article className={`message ${message.role}`} key={message.id}>
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return <p key={index}>{part.text}</p>;
                  }
                  return null;
                })}
              </article>
            ))
          )}
        </div>
      </section>

      <nav className="bottom-nav" aria-label="Primary">
        <a className="active" href="#kickoff-title">
          <Home size={24} />
          <span>Home</span>
        </a>
        <a href="#workflow-title">
          <PlayCircle size={24} />
          <span>Runs</span>
        </a>
        <a href="#timeline-title">
          <Settings size={24} />
          <span>Settings</span>
        </a>
      </nav>
    </main>
  );
}

function WorkflowGraph({ agents, edges }: { agents: AgentNode[]; edges: FlowEdge[] }) {
  const byId = new Map(agents.map((agent) => [agent.id, agent]));
  return (
    <div className="graph-wrap" aria-label="Agent graph visualization">
      <svg viewBox="0 0 100 92" role="img" aria-label="Khepri agent workflow graph">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>
        {edges.map((edge) => {
          const from = byId.get(edge.from)!;
          const to = byId.get(edge.to)!;
          return (
            <g key={`${edge.from}-${edge.to}`} className={edge.active ? "edge active" : "edge"}>
              <line x1={from.x + 4} y1={from.y} x2={to.x - 4} y2={to.y} markerEnd="url(#arrow)" />
              <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 2}>
                {edge.label}
              </text>
            </g>
          );
        })}
        {agents.map((agent) => {
          const initials = agent.shortName
            .split(" ")
            .map((word) => word[0])
            .join("")
            .slice(0, 2);
          return (
            <g key={agent.id} className={`graph-node ${agent.status}`}>
              <circle cx={agent.x} cy={agent.y} r="4.8" />
              <text className="node-initials" x={agent.x} y={agent.y + 1.2}>
                {initials}
              </text>
              <text className="node-label" x={agent.x} y={agent.y + 10}>
                {agent.shortName}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function TimelineRow({ agent, index }: { agent: AgentNode; index: number }) {
  const Icon = iconById[agent.id as keyof typeof iconById];
  return (
    <article className={`timeline-row ${agent.status}`}>
      <div className="step-number">{index + 1}</div>
      <div className="agent-icon">
        <Icon size={25} />
      </div>
      <div className="timeline-copy">
        <div className="row-title">
          <h3>{agent.name}</h3>
          <span>{agent.state}</span>
        </div>
        <p>{agent.detail}</p>
      </div>
      <button type="button" aria-label={`Expand ${agent.name}`}>
        <ChevronDown size={19} />
      </button>
    </article>
  );
}
