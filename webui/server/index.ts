import compression from "compression";
import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { approveAll, CopilotClient } from "@github/copilot-sdk";
import type { SessionEvent } from "@github/copilot-sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 4177);
const logLevels = ["none", "error", "warning", "info", "debug", "all"] as const;
type CopilotLogLevel = (typeof logLevels)[number];

let client: CopilotClient | undefined;
let clientStart: Promise<CopilotClient> | undefined;

type ChatBody = {
  messages?: Array<{
    role?: string;
    parts?: Array<{ type?: string; text?: string }>;
    content?: string;
  }>;
};

function readLatestPrompt(body: ChatBody): string {
  const messages = body.messages ?? [];
  const latestUser = [...messages].reverse().find((message) => message.role === "user");
  if (!latestUser) return "";

  const textParts = latestUser.parts
    ?.filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text?.trim())
    .filter(Boolean);

  return textParts?.join("\n").trim() || latestUser.content?.trim() || "";
}

async function getCopilotClient() {
  if (client) return client;
  if (!clientStart) {
    clientStart = (async () => {
      const next = new CopilotClient({
        autoStart: true,
        logLevel: logLevels.includes(process.env.COPILOT_LOG_LEVEL as CopilotLogLevel)
          ? (process.env.COPILOT_LOG_LEVEL as CopilotLogLevel)
          : "warning",
        useLoggedInUser: true,
      });
      await next.start();
      client = next;
      return next;
    })();
  }
  return clientStart;
}

function eventText(event: SessionEvent): string {
  if (event.type === "assistant.message_delta") {
    return String(event.data.deltaContent ?? "");
  }
  if (event.type === "assistant.message") {
    return String(event.data.content ?? "");
  }
  if (event.type === "tool.execution_start") {
    return `\n\nRunning ${event.data.toolName}...\n`;
  }
  if (event.type === "tool.execution_complete") {
    return `Done tool ${event.data.toolCallId}.\n`;
  }
  return "";
}

async function streamFallback(res: express.Response, prompt: string, reason: string) {
  const fallback = [
    "Khepri is running in local offline mode because the Copilot host is not available.",
    "",
    `Prompt received: ${prompt || "No prompt text was supplied."}`,
    "",
    "Workflow kickoff:",
    "1. Orchestrator records the request and creates a run.",
    "2. Spec and Knowledge agents capture requirements and repository context.",
    "3. Planner routes app, data, infra, and security work to advisor agents.",
    "4. Scaffold, Code, Test, and Assessor agents advance the implementation loop.",
    "",
    `Host note: ${reason}`,
  ].join("\n");

  for (const token of fallback.match(/.{1,24}(\s|$)/g) ?? [fallback]) {
    res.write(token);
    await new Promise((resolve) => setTimeout(resolve, 24));
  }
  res.end();
}

async function streamCopilot(res: express.Response, prompt: string) {
  const copilot = await getCopilotClient();
  const session = await copilot.createSession({
    model: process.env.COPILOT_MODEL || "gpt-5",
    onPermissionRequest: approveAll,
    systemMessage: {
      content: [
        "You are Project Khepri's modernization orchestrator.",
        "Coordinate repository modernization through these agents: khepri-orchestrator, khepri-spec, khepri-knowledge, khepri-planner, app-modernization, data-modernization, infra-modernization, security-modernization, khepri-scaffold, khepri-code, khepri-test, khepri-modernization-assessor, and khepri-evolution.",
        "Keep responses concise and describe state changes, agent handoffs, and validation evidence as the workflow advances.",
      ].join("\n"),
    },
    hooks: {
      onUserPromptSubmitted: async (input) => ({
        modifiedPrompt: [
          input.prompt,
          "",
          "Report workflow state changes and message handoffs in short sections so the local UI can mirror them in the graph.",
        ].join("\n"),
      }),
    },
  });

  let emittedFinal = false;
  const done = new Promise<void>((resolve, reject) => {
    const cleanup = session.on((event) => {
      const text = eventText(event);
      if (event.type === "assistant.message_delta" && text) {
        emittedFinal = true;
        res.write(text);
      }
      if (event.type === "assistant.message" && !emittedFinal && text) {
        res.write(text);
      }
      if (event.type === "session.idle") {
        cleanup();
        resolve();
      }
      if (event.type === "session.error") {
        cleanup();
        reject(new Error(String(event.data.message ?? "Copilot session failed")));
      }
    });
  });

  await session.send({ prompt });
  await done;
  await session.disconnect();
  res.end();
}

async function main() {
  const app = express();
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", async (_req, res) => {
    try {
      const copilot = await getCopilotClient();
      const auth = await copilot.getAuthStatus();
      res.json({ ok: true, mode: "copilot", auth });
    } catch (error) {
      res.json({
        ok: true,
        mode: "offline",
        auth: { status: "unavailable" },
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const prompt = readLatestPrompt(req.body as ChatBody);
    res.status(200);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");

    try {
      await streamCopilot(res, prompt);
    } catch (error) {
      await streamFallback(res, prompt, error instanceof Error ? error.message : String(error));
    }
  });

  if (isProduction) {
    app.use(express.static(path.join(root, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(root, "dist", "index.html"));
    });
  } else {
    const vite = await createViteServer({
      root,
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const server = createServer(app);
  server.listen(port, "127.0.0.1", () => {
    console.log(`Khepri WebUI listening at http://127.0.0.1:${port}`);
  });

  const shutdown = async () => {
    server.close();
    if (client) await client.stop();
  };
  process.on("SIGINT", () => void shutdown().finally(() => process.exit(0)));
  process.on("SIGTERM", () => void shutdown().finally(() => process.exit(0)));
}

await main();
