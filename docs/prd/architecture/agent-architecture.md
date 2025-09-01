# Agent Architecture

## Overview

The modernization system consists of specialized agents implemented as Semantic Kernel ChatCompletionAgents, each with distinct responsibilities and capabilities. These agents coordinate through AgentGroupChat and Semantic Kernel Process Framework to orchestrate complex modernization workflows.

## Core Agents

### 1. Knowledge Agent (ChatCompletionAgent)

**Purpose**: Retrieve, generate, and index knowledge assets at multiple abstraction levels

**Implementation**: Semantic Kernel ChatCompletionAgent with specialized plugins for knowledge extraction and generation

**Responsibilities**:
- Analyze existing code comments and documentation
- Generate missing code documentation  
- Create and maintain LSIF (Language Server Index Format) data
- Generate Gherkin behavior specifications
- Index knowledge assets in graph database
- Ingest existing knowledge when available
- Collaborate with Planning Agent for knowledge generation plans

**Capabilities**:
- Multi-level knowledge extraction (syntactic, semantic, behavioral)
- Knowledge graph construction and maintenance
- Document generation and validation
- Integration with existing documentation systems

**Knowledge Agent Workflow**:
```mermaid
flowchart TD
    A[Legacy Codebase Input] --> B{Existing Documentation?}
    B -->|Yes| C[Analyze Existing Documentation]
    B -->|No| D[Scan Code Structure]
    C --> E[Extract Knowledge Assets]
    D --> E
    E --> F[Generate LSIF Data]
    F --> G[Create Behavior Specifications]
    G --> H[Build Knowledge Graph]
    H --> I{Documentation Complete?}
    I -->|No| J[Generate Missing Documentation]
    J --> K[Validate Generated Content]
    K --> L[Update Knowledge Graph]
    L --> I
    I -->|Yes| M[Index Knowledge Assets]
    M --> N[Collaborate with Planning Agent]
    N --> O[Knowledge Ready for Modernization]
    
    style A fill:#e1f5fe
    style O fill:#c8e6c9
    style H fill:#fff3e0
    style N fill:#f3e5f5
```

### 2. Planning Agent (ChatCompletionAgent)

**Purpose**: Coordinate workflow planning and user collaboration for modernization efforts

**Implementation**: Semantic Kernel ChatCompletionAgent with specialized plugins for analysis and planning

**Responsibilities**:
- Index codebase and build initial knowledge graph
- Coordinate with Knowledge Agent for asset generation planning
- Generate modernization/migration plans
- Seek user approval for all plans and revisions
- Handle dependency analysis and architectural shift planning
- Generate Test-Driven Development plans
- Coordinate with Dev Agent for plan execution

**Capabilities**:
- Codebase analysis and indexing
- Dependency mapping and conflict resolution
- Migration path identification
- User collaboration workflows
- Plan versioning and approval tracking

**Planning Agent Workflow**:
```mermaid
flowchart TD
    A[Knowledge Assets from Knowledge Agent] --> B[Analyze Codebase Structure]
    B --> C[Map Dependencies]
    C --> D[Identify Migration Paths]
    D --> E[Generate Initial Plan]
    E --> F[Risk Assessment]
    F --> G[Create User Approval Request]
    G --> H{User Approval?}
    H -->|Approved| I[Coordinate with Dev Agent]
    H -->|Rejected| J[Revise Plan]
    J --> K[Update Risk Assessment]
    K --> G
    I --> L[Monitor Implementation Progress]
    L --> M{Implementation Issues?}
    M -->|Yes| N[Adjust Plan]
    N --> O[Request User Approval for Changes]
    O --> H
    M -->|No| P[Validate Completion]
    P --> Q[Modernization Plan Complete]
    
    style A fill:#e1f5fe
    style Q fill:#c8e6c9
    style H fill:#ffecb3
    style G fill:#f3e5f5
    style F fill:#ffcdd2
```

### 3. Dev Agent (ChatCompletionAgent)

**Purpose**: Execute development tasks following TDD methodology

**Implementation**: Semantic Kernel ChatCompletionAgent with specialized plugins for code generation and testing

**Responsibilities**:
- Implement minimal code signatures to make tests pass
- Follow language-specific interface patterns:
  - TypeScript & C#: Interfaces
  - Python: Protocols and Abstract Base Classes
  - Swift: Protocols and Interfaces
- Generate regression test suites
- Apply red-green-refactor TDD cycles
- Implement bare minimum code without stubbing

**Capabilities**:
- Multi-language code generation
- Test-first development approach
- Incremental implementation
- Code quality validation

**Dev Agent TDD Workflow**:
```mermaid
flowchart TD
    A[Plan from Planning Agent] --> B[Analyze Requirements]
    B --> C[Write Failing Test - RED]
    C --> D[Run Test Suite]
    D --> E{Test Fails as Expected?}
    E -->|Yes| F[Write Minimal Code - GREEN]
    E -->|No| G[Fix Test Implementation]
    G --> C
    F --> H[Run Test Suite]
    H --> I{All Tests Pass?}
    I -->|No| J[Debug Implementation]
    J --> F
    I -->|Yes| K[Refactor Code - REFACTOR]
    K --> L[Run Test Suite]
    L --> M{Tests Still Pass?}
    M -->|No| N[Fix Refactoring Issues]
    N --> K
    M -->|Yes| O{More Requirements?}
    O -->|Yes| P[Next Requirement]
    P --> C
    O -->|No| Q[Generate Regression Suite]
    Q --> R[Validate Implementation]
    R --> S[Code Ready for Integration]
    
    style C fill:#ffcdd2
    style F fill:#c8e6c9
    style K fill:#e1f5fe
    style S fill:#c8e6c9
    style E fill:#ffecb3
    style I fill:#ffecb3
    style M fill:#ffecb3
```

### 4. User Delegation Agent (ChatCompletionAgent - Optional)

**Purpose**: Represent user interests and preferences in automated workflows

**Implementation**: Semantic Kernel ChatCompletionAgent with user preference modeling plugins

**Responsibilities**:
- Maintain user preferences and constraints
- Provide automated approval for predefined scenarios
- Escalate complex decisions to human users
- Track user feedback and learning patterns

**User Delegation Workflow**:
```mermaid
flowchart TD
    A[Planning Agent Approval Request] --> B[Check User Preferences]
    B --> C{Matches Predefined Rules?}
    C -->|Yes| D[Auto-Approve]
    C -->|No| E[Complexity Assessment]
    E --> F{High Risk/Complex?}
    F -->|Yes| G[Escalate to Human User]
    F -->|No| H[Apply ML Preference Model]
    H --> I{Confidence > Threshold?}
    I -->|Yes| J[Auto-Approve with Notification]
    I -->|No| G
    G --> K[Wait for Human Response]
    K --> L[Update Preference Model]
    D --> M[Log Decision]
    J --> M
    L --> M
    M --> N[Notify Planning Agent]
    
    style G fill:#ffcdd2
    style D fill:#c8e6c9
    style J fill:#c8e6c9
    style B fill:#e1f5fe
```

### 5. Orchestration Agent (ChatCompletionAgent - Optional)

**Purpose**: High-level coordination and monitoring of the entire workflow

**Implementation**: Semantic Kernel ChatCompletionAgent with system monitoring and coordination plugins

**Responsibilities**:
- Monitor overall workflow health
- Handle cross-agent coordination issues
- Provide system-wide metrics and reporting
- Manage resource allocation and prioritization

## Agent Interaction Patterns

### Multi-Agent Sequence Flow
```mermaid
sequenceDiagram
    participant U as User
    participant P as Planning Agent
    participant K as Knowledge Agent
    participant D as Dev Agent
    participant UD as User Delegation
    
    Note over U,UD: Phase 1: Knowledge Discovery
    U->>P: Submit modernization request
    P->>K: Request codebase analysis
    K->>K: Extract knowledge assets
    K->>P: Return knowledge graph
    
    Note over U,UD: Phase 2: Planning & Approval
    P->>P: Generate modernization plan
    P->>UD: Request user approval
    UD->>U: Present plan for approval
    U->>UD: Approve/reject plan
    UD->>P: Return approval status
    
    Note over U,UD: Phase 3: Implementation
    P->>D: Execute approved plan
    loop TDD Cycle
        D->>D: Write failing test
        D->>D: Implement minimal code
        D->>D: Refactor if needed
    end
    D->>P: Implementation complete
    P->>U: Modernization finished
```

## Agent Configuration

### Semantic Kernel ChatCompletionAgent Setup
```csharp
// Example: Knowledge Agent Configuration
ChatCompletionAgent knowledgeAgent = new()
{
    Name = "KnowledgeAgent",
    Instructions = """
        You are a Knowledge Agent specialized in analyzing codebases and generating 
        comprehensive knowledge assets. Extract and generate code documentation, 
        maintain LSIF data, and create behavior specifications.
        """,
    Kernel = kernel,
    Arguments = new KernelArguments(new Dictionary<string, object?>
    {
        { "max_tokens", 4000 },
        { "temperature", 0.1 } // Low temperature for consistent analysis
    })
};
```

### Agent Plugin Integration
- **Knowledge Extraction Plugins**: Code analysis, documentation generation
- **Planning Plugins**: Dependency analysis, migration strategy generation
- **Development Plugins**: Test generation, code implementation, refactoring
- **Approval Plugins**: User preference modeling, decision automation

## Scalability and Performance

### Agent Scaling Patterns
- **Independent Scaling**: Each agent service scales based on workload
- **Resource Isolation**: Separate compute resources per agent type
- **Load Balancing**: Multiple instances for high-throughput scenarios
- **Stateless Design**: Agents maintain state through external storage

### Performance Optimization
- **Async Operations**: Non-blocking agent interactions
- **Caching**: Knowledge graph and analysis result caching
- **Batch Processing**: Efficient handling of large codebases
- **Parallel Execution**: Concurrent agent operations where appropriate

---

*This architecture provides the foundation for scalable, intelligent multi-agent modernization workflows.*
