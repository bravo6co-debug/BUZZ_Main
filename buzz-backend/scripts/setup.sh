#!/bin/bash

# Buzz Backend Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up Buzz Backend development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️ PostgreSQL is not installed. Please install PostgreSQL 12+ first."
    echo "   You can also use Docker: docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup environment variables
if [ ! -f .env ]; then
    echo "🔧 Setting up environment variables..."
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
    echo "📝 Please edit .env file with your actual database credentials and secrets"
else
    echo "✅ .env file already exists"
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p src/tests
mkdir -p src/migrations
mkdir -p src/seeds

echo "✅ Created necessary directories"

# Build the project
echo "🔨 Building the project..."
npm run build

echo "✅ Build completed successfully"

# Setup database (if environment variables are set)
if [ -f .env ]; then
    source .env
    if [ ! -z "$DB_HOST" ] && [ ! -z "$DB_NAME" ]; then
        echo "🗄️  Setting up database..."
        echo "Please make sure PostgreSQL is running and accessible"
        echo "Database: $DB_NAME at $DB_HOST:${DB_PORT:-5432}"
        
        # Note: In a real setup, you would run migrations here
        # npm run migrate
        echo "📝 Remember to run database migrations manually:"
        echo "   npm run migrate"
    fi
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your database credentials"
echo "2. Start PostgreSQL database"
echo "3. Run database migrations: npm run migrate"
echo "4. Start development server: npm run dev"
echo ""
echo "🌐 Server will be available at:"
echo "   API: http://localhost:3000/api"
echo "   Health: http://localhost:3000/health"
echo ""