#!/bin/bash
set -e

echo "🚀 Starting Conductor workspace setup..."

# Check for required tools
echo "✓ Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js (>=22.0.0) before running setup"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    echo "Please install npm (>=11.0.0) before running setup"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Error: Node.js version must be >=22.0.0 (current: $(node -v))"
    exit 1
fi

echo "✓ Node.js $(node -v) and npm $(npm -v) found"

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Set up environment variables
echo "🔧 Setting up environment variables..."

if [ -n "$CONDUCTOR_ROOT_PATH" ] && [ -f "$CONDUCTOR_ROOT_PATH/.env.local" ]; then
    echo "✓ Linking .env.local from repository root..."
    ln -sf "$CONDUCTOR_ROOT_PATH/.env.local" .env.local
    echo "✓ Environment file linked successfully"
elif [ -f ".env.local" ]; then
    echo "✓ .env.local already exists in workspace"
else
    echo "⚠️  Warning: No .env.local file found"
    echo "You'll need to create one with NEXT_PUBLIC_TAMBO_API_KEY"
    echo "Run 'npm run init' to set up Tambo, or copy from example.env.local"
fi

echo "✅ Workspace setup complete!"
echo "You can now run the development server with the Run button in Conductor"
