#!/bin/bash
# Test Script for Buzz Backend

set -e  # Exit on any error

echo "Running Buzz Backend Test Suite..."
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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Check if test database is available
print_status "Checking test database connection..."
if ! pg_isready -h ${TEST_DB_HOST:-localhost} -p ${TEST_DB_PORT:-5432} &> /dev/null; then
    print_error "Test database is not available"
    echo "Please make sure PostgreSQL is running and test database is configured"
    exit 1
fi

# Set test environment
export NODE_ENV=test

# Setup test database
print_status "Setting up test database..."
npm run migrate --env=test
npm run seed --env=test

# Run different test suites based on arguments
case "${1:-all}" in
    "unit")
        print_status "Running unit tests..."
        npm run test -- --testPathPattern="tests\/(?!integration)" --coverage
        ;;
    "integration")
        print_status "Running integration tests..."
        npm run test -- --testPathPattern="tests/integration" --runInBand
        ;;
    "auth")
        print_status "Running authentication tests..."
        npm run test -- tests/auth.test.ts
        ;;
    "user")
        print_status "Running user tests..."
        npm run test -- tests/user.test.ts
        ;;
    "business")
        print_status "Running business tests..."
        npm run test -- tests/business.test.ts
        ;;
    "admin")
        print_status "Running admin tests..."
        npm run test -- tests/admin.test.ts
        ;;
    "coverage")
        print_status "Running all tests with coverage report..."
        npm run test:coverage
        echo
        print_success "Coverage report generated in coverage/ directory"
        echo "Open coverage/lcov-report/index.html in your browser to view detailed coverage"
        ;;
    "watch")
        print_status "Running tests in watch mode..."
        npm run test:watch
        ;;
    "all"|*)
        print_status "Running all tests..."
        npm run test -- --coverage
        
        echo
        print_success "All tests completed!"
        echo
        echo "Test Results Summary:"
        echo "- Unit Tests: Authentication, User, Business, Admin"
        echo "- Integration Tests: Complete API workflows"
        echo "- Coverage Report: Available in coverage/ directory"
        echo
        echo "Available test commands:"
        echo "  ./scripts/test.sh unit         - Run unit tests only"
        echo "  ./scripts/test.sh integration  - Run integration tests only"
        echo "  ./scripts/test.sh auth         - Run auth tests only"
        echo "  ./scripts/test.sh user         - Run user tests only"
        echo "  ./scripts/test.sh business     - Run business tests only"
        echo "  ./scripts/test.sh admin        - Run admin tests only"
        echo "  ./scripts/test.sh coverage     - Run all tests with detailed coverage"
        echo "  ./scripts/test.sh watch        - Run tests in watch mode"
        ;;
esac

# Cleanup test database (optional, comment out to keep test data)
# print_status "Cleaning up test database..."
# npm run knex migrate:rollback --all --env=test