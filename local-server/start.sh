#!/bin/bash

echo "🚀 Starting WorkTrack Local Server..."
echo "📱 This enables per-device GitHub CLI integration"
echo ""

# Check if Bun is available
if command -v bun &> /dev/null; then
    echo "✅ Using Bun to start server..."
    bun run index.ts
elif command -v node &> /dev/null; then
    echo "✅ Using Node.js to start server..."
    node index.ts
else
    echo "❌ Neither Bun nor Node.js found. Please install one of them."
    exit 1
fi
