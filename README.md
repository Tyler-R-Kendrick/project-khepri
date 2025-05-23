# Project Khepri
A AI-driven code modernization framework for legacy codebases.

## Goal
The goal of this project is to provide an opinionated agent-driven process to produce high-quality modernized code from a legacy system.

## The Approach
The approach we will be implementing relies on several tools to be developed that produce intermediary representations of the code base so LLMs can have greater context and feedback loops as heuristics to inform their migration/modernization strategy. Below, we outline the tools identified to produce the emergent, catalytics capabilities of an AI modernization agent.

### Flow
To make the flow easy to debug, iterate on, and extend - we will build out multiple agents as part of an agentic workflow.
The workflow itself will be static, but each step will be orchestrated by an agent responsible for that phase of development.

Below, is an example of this process flow:

```mermaidjs

```

### Tools
- KnowledgeGraphRag: Models intermediary representations of code, business rules, and custom conventions.
- Planner4
  - Upgrades: Looks at version docs for a tech to identify upgrade path(s) and create a plan.
  - Rehosting: Evaluates hosting strategies and identify how to safely move from one hosting model to another.
  - Replatform: Evaluates usage of a technology/package and how to move to a different technology/package.
- Code2
  - NL: Generates a queryable knowledge base from code.
  - Comments: Enhances existing code with comments/annotations to improve LLM reasoning.
  - ReferenceDocs: Produce reference docs of the code base.
  - JsonSchema: Produce Json Schema docs for all public record/dto types.
  - Protobuf: Generates protobuf definitions as an IDL to simplify serialization of method signatures for later generation.
  - BDD Docs (Gherkin/Gauge): Produce busines requirement feature descriptions from code.
  - SBOM (CycloneDX): Generates a description of package dependencies for the project, to load type info and descriptions.
  - Structurizr: Generates model diagrams of the app/system. Provides c4 diagrams at a minimum.
  - TOSCA/CUE: Provides a model diagram of the logical and deployment architectures.
  - Test-Spec: Generates test cases to determine total coverage and provide regression suites on public types.
  - BPMN: Generates business process workflow definitions from code.
- Image2
  - Code: Creates UI code.
  - DesignTokens: Extracts design elements from an image as a standard intermediary format.
  - CSF3: Extracts design components from an images as a standrad intermediary format.
- NL2
  - Code: Produce code from natural language.
  - Structurizr: Generate model diagrams of the app/system.
  - TOSCA/CUE: Provides a model diagram of the logical and deployment architectures.
  - BPMN: Generates business process workflow definitions from natural language.
 
### Inputs
- Code: Ingest code to build multiple representations of the code.
- LSIF: Ingest current model of code in current context.
- ReferenceDocs: Ingest reference docs to reason about code in a more complete context aware manner.
- BDD Docs: Ingest feature files to figure out the business context and direct association to executable code.
- Structurizr: Ingest model diagrams to understand the relationship of executable entities across the app (especially in distributed contexts).
- TOSCA/CUE: Ingest models to determine the execution/hosting context of applications to better understand resilience needs and gaps.
- BPMN: Ingest bpmn diagrams to understand the busines context better.
- DesignTokens/CSF3: Ingest design assets and design system documentation to understand visual design requirements.

#### Customizations / Conventions
- Technical Docs: Specify frameworks and target tech stack.
- Policy info: Specify which regulatory requirements you need to be compliant with that could influence design.
- Code Style Guidelines: Provide style preferences for code-gen.
- Standards and Practices: Describe team patterns and practices for outputs.

### Undecided Intermediary Representation Formats
The following areas still need to be solved:
- Code conventions (.editor-config, linters, etc.)
- static application security testing (SAST tools like Veracode, CheckMarx, SonarQube, etc.)
- static analysis (Semgrep)
- Infrastructure as Code (IAC)
- CI/CD pipeline config ([OAM?](https://github.com/oam-dev/spec)).
- [Policy as Code](https://www.cncf.io/blog/2024/02/14/policy-as-code-in-the-software-supply-chain/) (something like CUE for CI/CD, Cedar for runtime, OPA, or Rego)
- Workflow Configurations DSLs ([CNCF Serverless Workflows](https://www.cncf.io/projects/serverless-workflow/), [OpenWDL](https://github.com/openwdl/wdl), [CWL](https://www.commonwl.org/, [Conductor?](https://conductor-oss.github.io/conductor/devguide/concepts/index.html), [etc.](https://github.com/common-workflow-language/common-workflow-language/wiki/Existing-Workflow-systems))
- Testing DSL
- Intermediate Verification Languages (Boogie, WhyML, [OCL](https://www.omg.org/spec/OCL/2.4/PDF), [Dafny](https://github.com/dafny-lang/dafny), etc.)
- Universal modeling DSLs ([D2?](https://d2lang.com/))

