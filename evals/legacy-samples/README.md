# Legacy Modernization Sample Packs

These sample packs are deterministic fixtures for Project Khepri modernization evals. They are intentionally small, but each one carries source artifacts, edge-case fixtures, expected legacy behavior, and a replay command description that agents can use as regression evidence before implementation.

Use these packs when improving Khepri agents, generated squads, or modernization workflow code:

- `cobol-claims`: COBOL CICS/BMS plus batch eligibility behavior with EBCDIC, packed decimal, and restart checkpoint concerns.
- `dotnet-framework-claims-portal`: legacy .NET Framework/IIS behavior with COM interop, 32-bit dependency, and machine.config drift concerns.
- `java-payment-monolith`: Java monolith behavior with JMS replay, transaction boundary, and classloader resource concerns.
