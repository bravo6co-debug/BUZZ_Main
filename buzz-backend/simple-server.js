const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const authRoutes = require('./src/auth-routes');
const userRoutes = require('./src/user-routes');
const businessRoutes = require('./src/business-routes');
const couponRoutes = require('./src/coupon-routes');
const adminRoutes = require('./src/admin-routes');
const settlementRoutes = require('./src/settlement-routes');
const uploadRoutes = require('./src/routes/upload-routes');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3003;

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentication routes
app.use('/api/auth', authRoutes);

// User management routes
app.use('/api/users', userRoutes);

// Business management routes
app.use('/api/business', businessRoutes);

// Coupon and mileage routes
app.use('/api/coupons', couponRoutes);

// Admin management routes
app.use('/api/admin', adminRoutes);

// Settlement routes
app.use('/api/settlement', settlementRoutes);

// File upload routes
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: error ? 'schema_missing' : 'connected',
      supabase: {
        url: supabaseUrl,
        connected: !error
      }
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

// API status
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Buzz Platform API is running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      // Test & Setup
      health: '/health',
      test_users: '/api/test/users',
      create_user: '/api/test/create-user',
      setup: '/api/setup/database',
      
      // Authentication
      auth: {
        register: '/api/auth/register',
        login: '/api/auth/login',
        social_google: '/api/auth/social/google',
        me: '/api/auth/me'
      },
      
      // User Management
      users: {
        profile: '/api/users/profile',
        referral_stats: '/api/users/referral-stats',
        referral_link: '/api/users/referral-link',
        coupons: '/api/users/coupons',
        mileage: '/api/users/mileage',
        transactions: '/api/users/mileage/transactions'
      },
      
      // Business Management
      business: {
        apply: '/api/business/apply',
        list: '/api/business/list',
        my: '/api/business/my'
      },
      
      // Coupon & Mileage
      coupons: {
        generate_qr: '/api/coupons/:id/generate-qr',
        mileage_qr: '/api/coupons/mileage/generate-qr',
        verify: '/api/coupons/verify',
        use: '/api/coupons/use',
        mileage_use: '/api/coupons/mileage/use'
      },
      
      // Admin Dashboard
      admin: {
        dashboard_stats: '/api/admin/dashboard/stats',
        recent_activity: '/api/admin/dashboard/recent-activity',
        users: '/api/admin/users',
        user_detail: '/api/admin/users/:id',
        budget_status: '/api/admin/budget/status',
        kill_switch: '/api/admin/budget/kill-switch'
      },
      
      // Settlement
      settlement: {
        request: '/api/settlement/request',
        my: '/api/settlement/my',
        available: '/api/settlement/available',
        admin_list: '/api/settlement/admin/list',
        admin_process: '/api/settlement/admin/:id/process',
        admin_complete: '/api/settlement/admin/:id/complete',
        admin_stats: '/api/settlement/admin/stats'
      }
    },
    features: [
      'JWT Authentication',
      'Social Login (Google Demo)',
      'User Management & Referral System',
      'Business Registration & Approval',
      'QR Code Generation (5min expiry)',
      'Coupon & Mileage System',
      'Admin Dashboard APIs',
      'Settlement System',
      'Budget Management with Kill Switch',
      'Real-time Statistics'
    ]
  });
});

// Simple test endpoints
app.get('/api/test/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(5);

    if (error) {
      return res.status(500).json({
        error: error.message,
        hint: 'Database schema may not be created yet. Check /api/setup/database for instructions.'
      });
    }

    res.json({
      users: data,
      count: data?.length || 0,
      message: data?.length === 0 ? 'No users found. Create some test users.' : 'Users loaded successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.post('/api/test/create-user', async (req, res) => {
  try {
    const testUser = {
      email: `test${Date.now()}@buzz-platform.kr`,
      name: 'Test User',
      role: 'user',
      auth_provider: 'email',
      is_active: true
    };

    const { data, error } = await supabase
      .from('users')
      .insert(testUser)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: error.message,
        hint: 'Database schema may not be created yet. Check /api/setup/database for instructions.'
      });
    }

    res.json({
      message: 'Test user created successfully',
      user: data
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Database setup instructions
app.get('/api/setup/database', async (req, res) => {
  res.json({
    message: 'Database setup instructions',
    status: 'Schema needs to be created in Supabase',
    instructions: [
      '1. Go to your Supabase dashboard: https://supabase.com/dashboard',
      '2. Select your project: ' + supabaseUrl,
      '3. Navigate to SQL Editor',
      '4. Create a new query and paste the content from supabase-schema.sql',
      '5. Run the query to create all tables',
      '6. Test the setup by visiting /api/test/users'
    ],
    files: {
      schema: 'supabase-schema.sql',
      location: 'buzz-backend/supabase-schema.sql'
    },
    test_endpoints: {
      users: '/api/test/users',
      create_user: '/api/test/create-user (POST)'
    }
  });
});

// Basic authentication endpoint (for testing)
app.post('/api/auth/test-login', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    // Find user by email
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'User not found',
        hint: 'Create a test user first at /api/test/create-user'
      });
    }

    res.json({
      message: 'Test login successful',
      user: {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role
      },
      token: 'fake-jwt-token-for-testing'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
    available_endpoints: {
      health: '/health',
      api_status: '/api/status',
      test_users: '/api/test/users',
      setup_instructions: '/api/setup/database'
    }
  });
});

// Start server
app.listen(port, () => {
  console.log('🚀 Buzz Backend Server Started!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 Server: http://localhost:${port}`);
  console.log(`🔗 Health Check: http://localhost:${port}/health`);
  console.log(`📊 API Status: http://localhost:${port}/api/status`);
  console.log(`🧪 Test Users: http://localhost:${port}/api/test/users`);
  console.log(`⚙️  Setup Guide: http://localhost:${port}/api/setup/database`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('⚠️  IMPORTANT: Database Schema Setup Required');
  console.log('👉 Go to: http://localhost:' + port + '/api/setup/database');
  console.log('👉 Follow the instructions to create database tables');
  console.log('');
  console.log('🔗 Supabase Project: ' + supabaseUrl);
  console.log('✨ Ready to receive requests!');
});

module.exports = app;