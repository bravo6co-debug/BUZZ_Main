#!/bin/bash
# Development Script for Buzz Backend (Linux/macOS)

set -e  # Exit on any error

echo "Starting Buzz Backend Development Environment..."
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

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
print_status "Using Node.js version: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed or not in PATH"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 &> /dev/null; then
    print_warning "PostgreSQL is not running on localhost:5432"
    echo "Please make sure PostgreSQL is installed and running"
    echo
    if command -v brew &> /dev/null; then
        echo "On macOS with Homebrew, you can start it with:"
        echo "  brew services start postgresql"
    elif command -v systemctl &> /dev/null; then
        echo "On Linux with systemd, you can start it with:"
        echo "  sudo systemctl start postgresql"
    fi
    echo
fi

# Check if .env file exists
if [ ! -f .env ]; then
    print_status "Creating .env file from example..."
    cp .env.example .env
    echo
    print_warning "Please edit .env file with your database credentials:"
    echo "- DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD"
    echo
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
    echo
fi

# Run database migrations
print_status "Running database migrations..."
if npm run migrate; then
    print_success "Database migrations completed"
else
    print_error "Database migration failed"
    echo "Please check your database connection settings in .env"
    exit 1
fi

# Run database seeds
print_status "Running database seeds..."
if npm run seed; then
    print_success "Database seeds completed"
else
    print_warning "Database seeding failed"
    echo "This might be because seeds have already been run"
    echo
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Display connection information
echo
echo "================================"
print_success "Development Environment Ready!"
echo "================================"
echo
echo "Server will start on: http://localhost:3000"
echo "API Documentation: http://localhost:3000/api/docs"
echo
echo "Test Accounts Created:"
echo
echo "ADMIN ACCOUNTS:"
echo "- superadmin@buzz.com / BuzzAdmin2024!"
echo "- admin@buzz.com / BuzzAdmin2024!"
echo "- business.manager@buzz.com / BuzzAdmin2024!"
echo "- content.manager@buzz.com / BuzzAdmin2024!"
echo
echo "BUSINESS ACCOUNTS:"
echo "- business1@example.com / Business123!"
echo "- business2@example.com / Business456!"
echo
echo "TEST USER ACCOUNTS:"
echo "- testuser1@example.com (Google OAuth)"
echo "- testuser2@example.com (Kakao OAuth)"
echo
echo "DATABASE INFO:"
echo "- Development DB: buzz_platform"
echo "- Test DB: buzz_platform_test"
echo
echo "Useful Commands:"
echo "- npm run dev          : Start development server"
echo "- npm run test         : Run tests"
echo "- npm run test:watch   : Run tests in watch mode"
echo "- npm run migrate      : Run migrations"
echo "- npm run seed         : Run seeds"
echo "- npm run db:reset     : Reset database"
echo
echo "Press Ctrl+C to stop the server"
echo

# Start the development server
print_status "Starting development server..."
npm run dev