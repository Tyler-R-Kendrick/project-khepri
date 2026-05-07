# Legacy .NET Framework Claims Portal Sample

Scenario id: `dotnet-framework-claims-portal`

Replay command: replay `fixtures/http-golden-master.json` against the target facade and compare route, status, payload, scheduling, and config parity.

Regression evidence must preserve:

- COM interop behavior behind the eligibility gateway.
- 32-bit dependency containment during target migration.
- machine.config/app.config drift that affects bindings and connection strings.
