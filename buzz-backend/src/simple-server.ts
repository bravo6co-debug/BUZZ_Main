import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3003;

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
      database: error ? 'disconnected' : 'connected',
      supabase: {
        url: supabaseUrl,
        connected: !error
      }
    };

    if (error) {
      status.database = 'schema_missing';
    }

    res.json(status);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API status
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Buzz Platform API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
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
        hint: 'Database schema may not be created yet'
      });
    }

    return res.json({
      users: data,
      count: data?.length || 0
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
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
        hint: 'Database schema may not be created yet'
      });
    }

    return res.json({
      message: 'Test user created successfully',
      user: data
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Database setup endpoint
app.post('/api/setup/database', async (req, res) => {
  try {
    // Create a simple users table for testing
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        auth_provider VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Note: This would need to be executed in Supabase SQL editor
    res.json({
      message: 'Database setup instructions ready',
      instructions: [
        '1. Go to your Supabase dashboard',
        '2. Navigate to SQL Editor',
        '3. Run the complete schema from supabase-schema.sql file',
        '4. Or run this basic table creation:',
        createUsersTable
      ],
      schema_file: 'supabase-schema.sql'
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
    path: req.originalUrl
  });
});

// Start server
app.listen(port, () => {
  console.log('🚀 Buzz Backend Server Started');
  console.log(`📍 Port: ${port}`);
  console.log(`🌐 Health: http://localhost:${port}/health`);
  console.log(`🔗 API Status: http://localhost:${port}/api/status`);
  console.log(`🧪 Test Users: http://localhost:${port}/api/test/users`);
  console.log('');
  console.log('⚠️  Database Schema Setup Required:');
  console.log('1. Go to Supabase Dashboard > SQL Editor');
  console.log('2. Run the SQL from supabase-schema.sql file');
  console.log('3. Test with: http://localhost:' + port + '/api/test/users');
});

export default app;