# Aspire Observability Setup

Your .NET Aspire application is now configured with observability through the Aspire Dashboard and OpenTelemetry Protocol (OTLP).

## Features Enabled

- ✅ **Aspire Dashboard**: Built-in observability dashboard for metrics, logs, and traces
- ✅ **OpenTelemetry**: Automatic instrumentation for ASP.NET Core, HTTP clients, and runtime metrics
- ✅ **Health Checks**: Endpoint monitoring for all services
- ✅ **Service Discovery**: Automatic service registration and discovery
- ✅ **Resilience**: Built-in retry policies and circuit breakers

## Running the Application

### In GitHub Codespaces

1. **Start the AppHost** (from the `dotnet/src/Khepri.AppHost` directory):
   ```bash
   cd /workspaces/project-khepri/dotnet/src/Khepri.AppHost
   dotnet run --launch-profile http
   ```

2. **Access the Aspire Dashboard**:
   - The dashboard will be automatically forwarded and opened in your browser
   - Or manually navigate to the forwarded port: `http://localhost:15888`
   - Look for the "Ports" tab in VS Code to see forwarded ports

### In Local Development

1. **Start the AppHost** (from the `dotnet/src/Khepri.AppHost` directory):
   ```bash
   dotnet run
   ```

2. **Access the Aspire Dashboard**:
   - Open your browser to: `https://localhost:15888`
   - Or: `http://localhost:15889`

## What You'll See in the Dashboard

### Services Tab
- All your agent services (Knowledge, Planning, Development, User Delegation, Workflow)
- Redis state store
- Service health status and endpoints

### Metrics Tab
- HTTP request metrics
- Runtime performance metrics
- Custom application metrics

### Traces Tab
- Distributed tracing across all services
- Request flows between agents
- Performance bottlenecks identification

### Logs Tab
- Structured logs from all services
- Filterable by service, log level, and time range
- Correlation with traces

## Environment Variables

The following environment variables are automatically configured:

- `DOTNET_DASHBOARD_OTLP_ENDPOINT_URL`: OTLP endpoint for telemetry
- `DOTNET_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS`: Allows unsecured access in development
- `OTEL_EXPORTER_OTLP_ENDPOINT`: OpenTelemetry exporter endpoint

## Service Endpoints

Once running, your services will be available at:

- **Knowledge Agent**: Auto-assigned port (check dashboard)
- **Planning Agent**: Auto-assigned port (check dashboard)
- **Development Agent**: Auto-assigned port (check dashboard)
- **User Delegation Agent**: Auto-assigned port (check dashboard)
- **Workflow Agent**: Auto-assigned port (check dashboard)
- **Redis**: Auto-assigned port (check dashboard)

## Health Checks

All services expose health check endpoints:
- `/health` - Overall health status
- `/alive` - Liveness check

These are automatically monitored by the Aspire Dashboard.

## Adding Custom Metrics

To add custom metrics to your agents, use the OpenTelemetry APIs:

```csharp
using System.Diagnostics.Metrics;

// In your service
private static readonly Meter AgentMeter = new("Khepri.Agent");
private static readonly Counter<int> ProcessedRequests = AgentMeter.CreateCounter<int>("agent_requests_processed");

// In your endpoint
ProcessedRequests.Add(1, new("agent", "knowledge"), new("operation", "analyze"));
```

## Troubleshooting

1. **Dashboard not accessible**: Check that the AppHost is running and ports are not blocked
2. **No telemetry data**: Ensure all services reference `Khepri.ServiceDefaults` and call `AddServiceDefaults()`
3. **Performance issues**: Check the traces tab for slow operations and bottlenecks
