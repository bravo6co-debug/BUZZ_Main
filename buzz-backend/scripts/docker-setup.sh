#!/bin/bash

# Docker Setup Script for Buzz Backend
# This script sets up the entire development environment using Docker

set -e

echo "🐳 Setting up Buzz Backend with Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker version: $(docker --version)"
echo "✅ Docker Compose version: $(docker-compose --version)"

# Copy database schema to sql directory for initialization
echo "📋 Copying database schema..."
mkdir -p sql
if [ -f "../06-database-schema-complete.sql" ]; then
    cp "../06-database-schema-complete.sql" sql/01-init.sql
    echo "✅ Database schema copied"
else
    echo "⚠️ Database schema file not found. Please copy 06-database-schema-complete.sql to sql/01-init.sql"
fi

# Create environment file for Docker if it doesn't exist
if [ ! -f .env.docker ]; then
    echo "🔧 Creating Docker environment file..."
    cat > .env.docker << EOF
# Docker Environment Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=buzz_platform
DB_USER=buzzuser
DB_PASSWORD=buzzpass123

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# JWT Configuration (Change in production!)
JWT_SECRET=development_jwt_secret_change_in_production
JWT_REFRESH_SECRET=development_refresh_secret_change_in_production

# CORS Configuration
CORS_ORIGIN=http://localhost:3001,http://localhost:3000

# Logging
LOG_LEVEL=debug
EOF
    echo "✅ Created .env.docker file"
else
    echo "✅ .env.docker file already exists"
fi

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d postgres redis

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Check if PostgreSQL is ready
until docker-compose exec postgres pg_isready -U buzzuser -d buzz_platform; do
    echo "⏳ Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready"

# Start the API service
echo "🚀 Starting API service..."
docker-compose up -d api

echo "⏳ Waiting for API to be ready..."
sleep 15

# Check API health
API_HEALTH=$(curl -s http://localhost:3000/health | grep -o '"status":"healthy"' || echo "")
if [ "$API_HEALTH" = '"status":"healthy"' ]; then
    echo "✅ API is healthy"
else
    echo "⚠️ API health check failed. Check logs with: docker-compose logs api"
fi

echo ""
echo "🎉 Docker setup completed!"
echo ""
echo "📋 Available services:"
echo "   API: http://localhost:3000"
echo "   Health: http://localhost:3000/health" 
echo "   PostgreSQL: localhost:5432 (user: buzzuser, db: buzz_platform)"
echo "   Redis: localhost:6379"
echo ""
echo "🔧 Useful commands:"
echo "   View logs: docker-compose logs -f [service]"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   Enter container: docker-compose exec [service] sh"
echo ""