#!/bin/bash

echo "🔍 Khepri Aspire Application Status Check"
echo "========================================="

# Check if the application is running
if curl -s -o /dev/null -w "%{http_code}" http://localhost:15888 | grep -q "200\|404\|302"; then
    echo "✅ Aspire Dashboard is accessible on http://localhost:15888"
    echo ""
    echo "📊 Open the dashboard in your browser:"
    echo "   - In Codespaces: Look for the 'Ports' tab and click on port 15888"
    echo "   - Or visit: http://localhost:15888"
    echo ""
else
    echo "❌ Aspire Dashboard is not accessible"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   1. Make sure the AppHost is running:"
    echo "      cd /workspaces/project-khepri/dotnet/src/Khepri.AppHost"
    echo "      dotnet run --launch-profile http"
    echo ""
    echo "   2. Check for any error messages in the terminal"
    echo "   3. Ensure port 15888 is forwarded in Codespaces"
    echo ""
fi

# Check if services are running
echo "🏃 Running Services:"
echo "-------------------"

SERVICES=("knowledge-agent" "planning-agent" "development-agent" "user-delegation-agent" "workflow-agent")

for service in "${SERVICES[@]}"; do
    if pgrep -f "$service" > /dev/null; then
        echo "✅ $service is running"
    else
        echo "❌ $service is not running"
    fi
done

echo ""
echo "🔗 Redis State Store:"
if pgrep -f "redis" > /dev/null; then
    echo "✅ Redis is running"
else
    echo "❌ Redis is not running"
fi

echo ""
echo "📝 For more information, see: /workspaces/project-khepri/dotnet/OBSERVABILITY.md"
