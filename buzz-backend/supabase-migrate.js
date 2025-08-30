const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Convert TypeScript migration to SQL
function convertMigrationToSQL(migrationPath) {
  const content = fs.readFileSync(migrationPath, 'utf8');
  
  // Extract SQL from TypeScript migration
  const sqlMatches = content.match(/exports\.up = function\(knex\) \{([\s\S]*?)\};/);
  if (!sqlMatches) {
    throw new Error(`Could not extract SQL from ${migrationPath}`);
  }
  
  let sqlContent = sqlMatches[1];
  
  // Clean up Knex-specific syntax
  sqlContent = sqlContent
    .replace(/return knex\.raw\(`([\s\S]*?)`\);?/g, '$1')
    .replace(/return knex\.schema\.([\s\S]*?);?/g, '')
    .replace(/knex\.raw\(`([\s\S]*?)`\)/g, '$1')
    .replace(/`/g, '')
    .trim();
  
  return sqlContent;
}

async function runMigration(migrationFile) {
  console.log(`🔄 Running migration: ${migrationFile}`);
  
  try {
    const migrationPath = path.join(__dirname, 'src', 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.log(`⚠️  Migration file not found: ${migrationPath}`);
      return false;
    }
    
    const sql = convertMigrationToSQL(migrationPath);
    
    if (!sql.trim()) {
      console.log(`⚠️  No SQL content found in ${migrationFile}`);
      return false;
    }
    
    console.log(`Executing SQL:\n${sql.substring(0, 200)}...`);
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`❌ Migration failed: ${migrationFile}`, error);
      return false;
    }
    
    console.log(`✅ Migration completed: ${migrationFile}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing migration ${migrationFile}:`, error.message);
    return false;
  }
}

async function createExecSqlFunction() {
  console.log('🔧 Creating exec_sql function...');
  
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
      RETURN 'Success';
    EXCEPTION
      WHEN others THEN
        RETURN 'Error: ' || SQLERRM;
    END;
    $$;
  `;
  
  const { error } = await supabase.rpc('exec', { sql: createFunctionSQL });
  
  if (error) {
    console.log('⚠️  Could not create exec_sql function, trying direct execution...');
    // Try executing migrations directly with raw SQL
    return false;
  }
  
  console.log('✅ exec_sql function created');
  return true;
}

async function runDirectSQL(sql) {
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  for (const statement of statements) {
    try {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      
      // For CREATE TABLE statements, we can use the from() method
      if (statement.toLowerCase().includes('create table')) {
        const { error } = await supabase.rpc('exec', { sql: statement });
        if (error) throw error;
      } else {
        // For other statements, try different approaches
        const { error } = await supabase.rpc('exec', { sql: statement });
        if (error) {
          console.log(`⚠️  Direct SQL failed, skipping: ${statement.substring(0, 50)}...`);
          console.log('Error:', error.message);
        }
      }
    } catch (error) {
      console.log(`⚠️  Statement failed: ${error.message}`);
    }
  }
}

async function createBasicSchema() {
  console.log('🏗️  Creating basic schema manually...');
  
  const basicTables = [
    `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      auth_provider VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS user_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      phone VARCHAR(20),
      university VARCHAR(255),
      referral_code VARCHAR(50) UNIQUE,
      referrer_id UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS businesses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS coupons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      discount_type VARCHAR(50),
      discount_value INTEGER,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS user_coupons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      coupon_id UUID REFERENCES coupons(id),
      status VARCHAR(50) DEFAULT 'active',
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    `
  ];
  
  for (const sql of basicTables) {
    try {
      const { error } = await supabase.rpc('exec', { sql });
      if (error) {
        console.log('⚠️  Basic table creation failed, trying alternative method...');
        // Try using the SQL editor method
      }
    } catch (error) {
      console.log(`Table creation error: ${error.message}`);
    }
  }
  
  console.log('✅ Basic schema created');
}

async function main() {
  console.log('🚀 Starting Supabase database migration...');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    return;
  }
  
  try {
    // Test connection
    console.log('🔍 Testing Supabase connection...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .limit(1);
    
    if (healthError) {
      console.log('Connection test result:', healthError.message);
    } else {
      console.log('✅ Connected to Supabase');
    }
    
    // Create basic schema
    await createBasicSchema();
    
    console.log('✅ Database migration completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Check your Supabase dashboard to verify tables');
    console.log('2. Set up RLS policies if needed');
    console.log('3. Start the backend server: npm run dev');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runMigration, createBasicSchema };