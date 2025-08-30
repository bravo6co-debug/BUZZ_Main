@echo off
REM Windows Development Script for Buzz Backend

echo Starting Buzz Backend Development Environment...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if PostgreSQL is running
pg_isready -h localhost -p 5432 >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: PostgreSQL is not running on localhost:5432
    echo Please make sure PostgreSQL is installed and running
    echo.
    echo You can start it with: net start postgresql-x64-14
    echo (Replace x64-14 with your PostgreSQL version)
    echo.
)

REM Check if .env file exists
if not exist .env (
    echo Creating .env file from example...
    copy .env.example .env
    echo.
    echo Please edit .env file with your database credentials:
    echo - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
    echo.
)

REM Install dependencies if node_modules doesn't exist
if not exist node_modules (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

REM Run database migrations
echo Running database migrations...
npm run migrate
if %errorlevel% neq 0 (
    echo ERROR: Database migration failed
    echo Please check your database connection settings in .env
    pause
    exit /b 1
)

REM Run database seeds
echo Running database seeds...
npm run seed
if %errorlevel% neq 0 (
    echo WARNING: Database seeding failed
    echo This might be because seeds have already been run
    echo.
)

REM Create logs directory if it doesn't exist
if not exist logs mkdir logs

REM Display connection information
echo.
echo ================================
echo Development Environment Ready!
echo ================================
echo.
echo Server will start on: http://localhost:3000
echo API Documentation: http://localhost:3000/api/docs
echo.
echo Test Accounts Created:
echo.
echo ADMIN ACCOUNTS:
echo - superadmin@buzz.com / BuzzAdmin2024!
echo - admin@buzz.com / BuzzAdmin2024!
echo - business.manager@buzz.com / BuzzAdmin2024!
echo - content.manager@buzz.com / BuzzAdmin2024!
echo.
echo BUSINESS ACCOUNTS:
echo - business1@example.com / Business123!
echo - business2@example.com / Business456!
echo.
echo TEST USER ACCOUNTS:
echo - testuser1@example.com (Google OAuth)
echo - testuser2@example.com (Kakao OAuth)
echo.
echo DATABASE INFO:
echo - Development DB: buzz_platform
echo - Test DB: buzz_platform_test
echo.
echo Useful Commands:
echo - npm run dev          : Start development server
echo - npm run test         : Run tests
echo - npm run test:watch   : Run tests in watch mode
echo - npm run migrate      : Run migrations
echo - npm run seed         : Run seeds
echo - npm run db:reset     : Reset database
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the development server
npm run dev