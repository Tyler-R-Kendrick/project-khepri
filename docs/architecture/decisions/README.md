# Project Khepri Architecture Decision Records

## Overview

This directory contains the architecture decision records (ADRs) for the Khepri project. Each ADR is a markdown file that describes a specific architectural decision made during the development of the project.

The purpose of these records is to document the reasoning behind the decisions, the alternatives considered, and the consequences of the decisions. This helps in understanding the evolution of the project and provides a reference for future development.

## Initial Decisions

### Technologies

#### Programming Languages

- **csharp**: The Khepri project is primarily written in C#. This decision was made to leverage the performance and capabilities of the .NET ecosystem, which is well-suited for building robust and scalable applications.
- **python**: Due to the high adoption of Python in the data science and machine learning communities, its community has more libraries and tools available for rapid development of LLM toolsets. If a libraries and patterns are not available in C#, the Khepri project will use Python for those components. This decision allows for flexibility and the ability to leverage existing tools and libraries.

#### csharp Frameworks

- **.NET**: The Khepri project uses the .NET framework for building the core application. This decision was made to take advantage of the performance, security, and scalability features provided by the .NET ecosystem.
- **Microsoft.Extensions.AI**: The Khepri project uses the Microsoft.Extensions.AI library for building the LLM components. This decision was made to leverage the capabilities of Microsoft.Extensions.AI for building and managing LLMs, which is a key component of the Khepri project. This library should be used unless a feature is not available in the library. In that case, the Semantic Kernel library should be used.
- **Semantic Kernel**: The Khepri project uses the Semantic Kernel library for building the LLM components. This decision was made to leverage the capabilities of Semantic Kernel for building and managing LLMs, which is a key component of the Khepri project.

#### Python Frameworks

- **fastAPI**: The Khepri project uses the FastAPI framework for building the Python components. This is because FastAPI is the backbone of many other projects we intend to use, such as LangServe, MCP, and azure function runtime.
- **Semantic Kernel**: The Khepri project uses the Semantic Kernel library for building the LLM components. This decision was made to leverage the capabilities of Semantic Kernel for building and managing LLMs, which is a key component of the Khepri project.

#### Protocols

- **MCP**: We will leverage MCP to expose capabilities as tools/prompts/resources for reuse as MCP servers.
- **OTLP**: We will leverage OTLP to expose telemetry data to the Khepri project. This decision was made to leverage the capabilities of OTLP for building and managing telemetry data, which is a key component of the Khepri project.
- **A2A**: For agents, we will leverage A2A for discoverability and orchestration.
- **GitHub Copilot custom agents**: The repository now uses `.github/agents` profiles to encode the Khepri modernization workflow. Agent frontmatter declares tools, MCP servers, and official `handoffs` so orchestration is machine-checkable instead of only described in prose.
- **Agent Skills**: The repository uses `.github/skills` for reusable agent behavior. The `learn` skill and matching hook capture user corrections as generalized steering in `STEERING.md`.
- **AgentEvals/AgentV**: The custom-agent system is validated with AgentEvals/AgentV so profile structure, orchestration, `khepri-evolution`, `learn`, and steering behavior have executable checks.

#### Agent Workflow Decisions

- **Bounded phase agents**: Modernization work is split across spec, knowledge, planning, scaffolding, coding, test, and assessment agents. Each agent owns a narrow responsibility and has least-privilege tool access.
- **Continuous evolution**: `khepri-evolution` runs alongside all other agent work as a continuous improvement companion. It watches handoffs, evidence, failures, and user corrections, then suggests or implements approved improvements to agents, skills, hooks, MCPs, evals, and steering.
- **Awesome Copilot MCP**: `khepri-evolution` has the official Awesome Copilot MCP server configured as `awesome-copilot/*` so it can recommend reusable Copilot agents, skills, instructions, prompts, hooks, plugins, MCPs, tools, and workflows for better modernization outcomes.
- **Steering over repetition**: User corrections should be generalized into `STEERING.md` through the `learn` skill and hook so all agents can avoid repeating the same mistake.

#### Documentation

- **Markdown**: The Khepri project uses Markdown for documentation. This decision was made to leverage the simplicity and readability of Markdown for documenting the project. Markdown is widely used and supported, making it a good choice for documentation.

#### Dev Environment

- **VSCode**: The Khepri project uses Visual Studio Code as the primary development environment. This decision was made to leverage the flexibility and extensibility of VSCode, which is a popular choice among developers for building .NET applications. VSCode provides a rich set of features and extensions that enhance the development experience.
- **Docker**: Because we're developing MCP servers that can be hosted as containers, we will use docker and docker-compose in our dev container definitions to add and test mcp capabilities that we develop.
