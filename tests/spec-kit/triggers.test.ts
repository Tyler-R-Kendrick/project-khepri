const shouldTriggerPrompts = [
  "Install GitHub spec-kit in this repo and make Codex use its skills",
  "Run specify init with the Codex skills integration",
  "The docs say /speckit.plan but I am in Codex, what do I invoke?",
  "Create a spec-driven workflow for a new feature",
  "Generate spec-kit tasks from my implementation plan",
  "Switch this Spec Kit project from Copilot to Codex",
  "Explain when to use $speckit-specify vs $speckit-plan"
];

const shouldNotTriggerPrompts = [
  "Write a unit test for this React component",
  "Write a spreadsheet automation skill for Excel files",
  "Summarize this README without changing anything",
  "Fix this CSS contrast issue",
  "Draft an ADR for database selection",
  "Run the .NET test suite",
  "Query Microsoft Learn for the latest Azure Functions docs"
];
