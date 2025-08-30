@echo off
setlocal enabledelayedexpansion

:: Buzz Backend Setup Script for Windows
:: This script sets up the development environment

echo 🚀 Setting up Buzz Backend development environment...

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

:: Check Node.js version
for /f "tokens=1 delims=." %%v in ('node -v') do set NODE_MAJOR=%%v
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% lss 18 (
    echo ❌ Node.js version must be 18 or higher.
    node -v
    pause
    exit /b 1
)

echo ✅ Node.js version:
node -v

:: Check if PostgreSQL is installed
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️ PostgreSQL is not installed. Please install PostgreSQL 12+ first.
    echo    You can also use Docker: docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15
)

:: Install dependencies
echo 📦 Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

:: Setup environment variables
if not exist .env (
    echo 🔧 Setting up environment variables...
    copy .env.example .env
    echo ✅ Created .env file from .env.example
    echo 📝 Please edit .env file with your actual database credentials and secrets
) else (
    echo ✅ .env file already exists
)

:: Create necessary directories
echo 📁 Creating directories...
if not exist logs mkdir logs
if not exist uploads mkdir uploads
if not exist src\tests mkdir src\tests
if not exist src\migrations mkdir src\migrations
if not exist src\seeds mkdir src\seeds

echo ✅ Created necessary directories

:: Build the project
echo 🔨 Building the project...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo ✅ Build completed successfully

echo.
echo 🎉 Setup completed successfully!
echo.
echo 📋 Next steps:
echo 1. Edit .env file with your database credentials
echo 2. Start PostgreSQL database
echo 3. Run database migrations: npm run migrate
echo 4. Start development server: npm run dev
echo.
echo 🌐 Server will be available at:
echo    API: http://localhost:3000/api
echo    Health: http://localhost:3000/health
echo.

pause