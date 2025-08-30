#!/bin/bash
# Production Deployment Script for Buzz Backend

set -e  # Exit on any error

echo "Buzz Backend Production Deployment"
echo "=================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Configuration
ENVIRONMENT=${1:-production}
BUILD_DIR="dist"
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
LOG_FILE="deployment_$(date +%Y%m%d_%H%M%S).log"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    print_error "Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

print_status "Deploying to: $ENVIRONMENT"
echo "Log file: $LOG_FILE"
echo

# Pre-deployment checks
print_status "Running pre-deployment checks..."

# Check if required environment variables are set
REQUIRED_VARS=(
    "DATABASE_URL"
    "JWT_SECRET"
    "NODE_ENV"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        print_error "Required environment variable $var is not set"
        exit 1
    fi
done

print_success "Environment variables check passed"

# Check if Node.js and npm are available
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

NODE_VERSION=$(node --version)
print_status "Using Node.js version: $NODE_VERSION"

# Check if database is accessible
print_status "Testing database connection..."
if ! npm run knex migrate:currentVersion --env=$ENVIRONMENT &>/dev/null; then
    print_error "Cannot connect to database"
    echo "Please check DATABASE_URL and ensure database is accessible"
    exit 1
fi

print_success "Database connection test passed"

# Run tests before deployment
print_status "Running test suite..."
if ! npm run test &>/dev/null; then
    print_error "Tests failed. Deployment aborted."
    echo "Run 'npm run test' to see detailed test results"
    exit 1
fi

print_success "All tests passed"

# Create backup of current deployment (if exists)
if [[ -d "$BUILD_DIR" ]]; then
    print_status "Creating backup of current deployment..."
    mkdir -p "$BACKUP_DIR"
    cp -r "$BUILD_DIR" "$BACKUP_DIR/"
    print_success "Backup created: $BACKUP_DIR"
fi

# Install production dependencies
print_status "Installing production dependencies..."
npm ci --only=production --silent

# Build the application
print_status "Building application..."
npm run build

if [[ ! -d "$BUILD_DIR" ]]; then
    print_error "Build failed - no build directory found"
    exit 1
fi

print_success "Application built successfully"

# Database migrations
print_status "Running database migrations..."
npm run knex migrate:latest --env=$ENVIRONMENT

if [[ $? -eq 0 ]]; then
    print_success "Database migrations completed"
else
    print_error "Database migrations failed"
    
    # Rollback build if migrations failed
    if [[ -d "$BACKUP_DIR" ]]; then
        print_warning "Rolling back to previous build..."
        rm -rf "$BUILD_DIR"
        mv "$BACKUP_DIR/$BUILD_DIR" .
        print_status "Rollback completed"
    fi
    exit 1
fi

# Health check function
health_check() {
    local max_attempts=30
    local attempt=1
    
    print_status "Performing health check..."
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost:${PORT:-3000}/health &>/dev/null; then
            print_success "Health check passed"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    print_error "Health check failed after $max_attempts attempts"
    return 1
}

# Start/Restart the application
print_status "Starting application..."

# If using PM2
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "buzz-backend"; then
        pm2 restart buzz-backend --update-env
    else
        pm2 start "$BUILD_DIR/server.js" --name "buzz-backend" --env $ENVIRONMENT
    fi
    
    sleep 5  # Give the app time to start
    
    if health_check; then
        print_success "Application started successfully with PM2"
    else
        print_error "Application failed to start properly"
        pm2 logs buzz-backend --lines 20
        exit 1
    fi

# If using systemd
elif systemctl --version &>/dev/null; then
    sudo systemctl restart buzz-backend
    sleep 5
    
    if health_check; then
        print_success "Application started successfully with systemd"
    else
        print_error "Application failed to start properly"
        sudo journalctl -u buzz-backend -n 20
        exit 1
    fi

# Manual start (development/testing)
else
    print_warning "No process manager detected. Manual start required."
    echo "To start the application manually:"
    echo "  NODE_ENV=$ENVIRONMENT node $BUILD_DIR/server.js"
fi

# Post-deployment tasks
print_status "Running post-deployment tasks..."

# Clear application cache (if applicable)
if [[ -d "cache" ]]; then
    rm -rf cache/*
    print_status "Application cache cleared"
fi

# Update API documentation (if needed)
if [[ -f "scripts/update-docs.sh" ]]; then
    ./scripts/update-docs.sh
    print_status "API documentation updated"
fi

# Send deployment notification (if configured)
if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚀 Buzz Backend deployed to $ENVIRONMENT successfully\"}" \
        "$SLACK_WEBHOOK_URL" &>/dev/null
    print_status "Slack notification sent"
fi

# Clean up old backups (keep only last 5)
find . -maxdepth 1 -name "backup_*" -type d | sort -r | tail -n +6 | xargs rm -rf 2>/dev/null || true

# Final status
echo
echo "========================================"
print_success "Deployment completed successfully!"
echo "========================================"
echo
echo "Environment: $ENVIRONMENT"
echo "Build directory: $BUILD_DIR"
echo "Deployment time: $(date)"
echo "Application URL: ${APP_URL:-http://localhost:${PORT:-3000}}"
echo "API Documentation: ${APP_URL:-http://localhost:${PORT:-3000}}/api/docs"
echo
echo "Monitoring commands:"
if command -v pm2 &> /dev/null; then
    echo "  pm2 status buzz-backend    - Check application status"
    echo "  pm2 logs buzz-backend      - View application logs"
    echo "  pm2 monit                  - Monitor application metrics"
elif systemctl --version &>/dev/null; then
    echo "  sudo systemctl status buzz-backend      - Check application status"
    echo "  sudo journalctl -u buzz-backend -f     - View application logs"
fi
echo
echo "Database commands:"
echo "  npm run knex migrate:status --env=$ENVIRONMENT    - Check migration status"
echo "  npm run knex migrate:rollback --env=$ENVIRONMENT  - Rollback last migration"
echo

# Log deployment details
{
    echo "Deployment completed at: $(date)"
    echo "Environment: $ENVIRONMENT"
    echo "Node.js version: $NODE_VERSION"
    echo "Build directory: $BUILD_DIR"
    echo "Git commit: $(git rev-parse HEAD 2>/dev/null || echo 'N/A')"
    echo "Git branch: $(git branch --show-current 2>/dev/null || echo 'N/A')"
} >> "$LOG_FILE"

print_status "Deployment details logged to: $LOG_FILE"