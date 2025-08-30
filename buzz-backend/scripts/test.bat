@echo off
REM Test Script for Buzz Backend (Windows)

echo Running Buzz Backend Test Suite...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    exit /b 1
)

REM Check if dependencies are installed
if not exist node_modules (
    echo Installing dependencies...
    npm install
)

REM Check if test database is available
echo Checking test database connection...
pg_isready -h %TEST_DB_HOST% -p %TEST_DB_PORT% >nul 2>&1
if %errorlevel% neq 0 (
    pg_isready -h localhost -p 5432 >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Test database is not available
        echo Please make sure PostgreSQL is running and test database is configured
        exit /b 1
    )
)

REM Set test environment
set NODE_ENV=test

REM Setup test database
echo Setting up test database...
call npm run migrate --env=test
call npm run seed --env=test

REM Run different test suites based on arguments
if "%1"=="unit" (
    echo Running unit tests...
    npm run test -- --testPathPattern="tests\/(?!integration)" --coverage
) else if "%1"=="integration" (
    echo Running integration tests...
    npm run test -- --testPathPattern="tests/integration" --runInBand
) else if "%1"=="auth" (
    echo Running authentication tests...
    npm run test -- tests/auth.test.ts
) else if "%1"=="user" (
    echo Running user tests...
    npm run test -- tests/user.test.ts
) else if "%1"=="business" (
    echo Running business tests...
    npm run test -- tests/business.test.ts
) else if "%1"=="admin" (
    echo Running admin tests...
    npm run test -- tests/admin.test.ts
) else if "%1"=="coverage" (
    echo Running all tests with coverage report...
    npm run test:coverage
    echo.
    echo Coverage report generated in coverage\ directory
    echo Open coverage\lcov-report\index.html in your browser to view detailed coverage
) else if "%1"=="watch" (
    echo Running tests in watch mode...
    npm run test:watch
) else (
    echo Running all tests...
    npm run test -- --coverage
    
    echo.
    echo All tests completed!
    echo.
    echo Test Results Summary:
    echo - Unit Tests: Authentication, User, Business, Admin
    echo - Integration Tests: Complete API workflows
    echo - Coverage Report: Available in coverage\ directory
    echo.
    echo Available test commands:
    echo   scripts\test.bat unit         - Run unit tests only
    echo   scripts\test.bat integration  - Run integration tests only
    echo   scripts\test.bat auth         - Run auth tests only
    echo   scripts\test.bat user         - Run user tests only
    echo   scripts\test.bat business     - Run business tests only
    echo   scripts\test.bat admin        - Run admin tests only
    echo   scripts\test.bat coverage     - Run all tests with detailed coverage
    echo   scripts\test.bat watch        - Run tests in watch mode
)

REM Cleanup test database (optional, comment out to keep test data)
REM echo Cleaning up test database...
REM npm run knex migrate:rollback --all --env=test