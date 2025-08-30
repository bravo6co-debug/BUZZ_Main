# 🚀 Buzz Platform Backend Setup Guide

## ✅ Current Status

✅ Supabase connection configured  
✅ Backend server running on http://localhost:3003  
✅ Database schema files created  
⚠️  **Database tables need to be created in Supabase**

## 📋 Next Steps to Complete Setup

### 1. Create Database Tables in Supabase

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: https://ssokfehixfpkbgcghkxy.supabase.co

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run Database Schema**
   - Open the file: `buzz-backend/supabase-schema.sql`
   - Copy the entire content
   - Paste it into the SQL Editor
   - Click "Run" to execute

4. **Verify Setup**
   - Visit: http://localhost:3003/api/test/users
   - Should show: `{"users":[],"count":0,"message":"No users found..."}`
   - If you see an error, the schema wasn't created properly

### 2. Test the API

```bash
# Test health check
curl http://localhost:3003/health

# Test user endpoints
curl http://localhost:3003/api/test/users

# Create a test user
curl -X POST http://localhost:3003/api/test/create-user

# Test authentication
curl -X POST http://localhost:3003/api/auth/test-login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@buzz-platform.kr"}'
```

### 3. Connect Frontend Applications

Once the database is set up, you can connect the frontend applications:

- **Buzz App**: http://localhost:5173 (user app)
- **Buzz Admin**: http://localhost:3001 (admin dashboard)
- **Backend API**: http://localhost:3003 (this server)

## 🛠 What's Been Implemented

### Backend Server Features
- ✅ Supabase connection with service role
- ✅ CORS configured for frontend apps
- ✅ Health check endpoint
- ✅ Basic user management endpoints
- ✅ Test authentication endpoint
- ✅ Error handling and logging

### Database Schema
- ✅ Complete user management system
- ✅ Business application and management
- ✅ Referral tracking system
- ✅ Coupon and mileage systems
- ✅ Settlement and budget management
- ✅ Admin role-based access
- ✅ Audit logging system
- ✅ Content management

### Available Endpoints

#### Health & Status
- `GET /health` - Server health check
- `GET /api/status` - API status and endpoints

#### Testing Endpoints
- `GET /api/test/users` - List users (max 5)
- `POST /api/test/create-user` - Create a test user
- `POST /api/auth/test-login` - Test login with email

#### Setup
- `GET /api/setup/database` - Database setup instructions

## 🔧 Environment Configuration

Your `.env` file is configured with:
- ✅ Supabase URL and keys
- ✅ Database connection settings
- ✅ JWT configuration
- ✅ Business logic settings
- ✅ Budget control settings

## 🗂 File Structure

```
buzz-backend/
├── .env                    # Environment configuration
├── supabase-schema.sql     # Complete database schema
├── simple-server.js        # Running server
├── src/
│   ├── migrations/         # TypeScript migrations (reference)
│   └── config/
│       └── supabase.ts     # Supabase client setup
```

## 🚨 Troubleshooting

### Database Connection Issues
1. Check Supabase dashboard is accessible
2. Verify project URL matches `.env` file
3. Ensure service role key is correct

### Schema Creation Issues
1. Make sure you're using the SQL Editor (not Table Editor)
2. Run the entire `supabase-schema.sql` content at once
3. Check for error messages in the SQL Editor

### API Endpoint Issues
1. Ensure server is running: http://localhost:3003/health
2. Check CORS settings for your frontend domain
3. Verify database tables exist: http://localhost:3003/api/test/users

## 📞 Support

- Backend Server Status: http://localhost:3003/api/status
- Setup Instructions: http://localhost:3003/api/setup/database
- Health Check: http://localhost:3003/health

---

**Ready to proceed!** 🎉  
Complete the database setup and you'll have a fully functional Buzz Platform backend!