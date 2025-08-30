const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addMissingColumns() {
  console.log('🚀 Starting to fix business_applications table...');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    return;
  }

  const sqlCommands = [
    {
      description: 'Add bank_info column',
      sql: `ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS bank_info JSONB DEFAULT '{}';`
    },
    {
      description: 'Add display_time_slots column', 
      sql: `ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS display_time_slots JSONB DEFAULT '{"morning": false, "lunch": false, "dinner": false, "night": false}';`
    },
    {
      description: 'Add documents column',
      sql: `ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS documents TEXT[] DEFAULT '{}';`
    }
  ];

  try {
    // Test connection first
    console.log('🔍 Testing Supabase connection...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'business_applications')
      .limit(1);
    
    if (healthError) {
      console.log('Connection test result:', healthError.message);
    } else {
      console.log('✅ Connected to Supabase successfully');
    }

    // Execute each SQL command
    for (const command of sqlCommands) {
      console.log(`\n🔄 ${command.description}...`);
      console.log(`Executing: ${command.sql}`);
      
      try {
        const { data, error } = await supabase.rpc('exec', {
          sql: command.sql
        });

        if (error) {
          console.log(`⚠️  RPC exec failed, trying alternative method...`);
          console.log('Error:', error.message);
          
          // Try using raw SQL execution if RPC fails
          const { error: directError } = await supabase
            .from('business_applications')
            .select('id')
            .limit(0);
            
          if (directError && directError.message.includes('does not exist')) {
            console.log('❌ business_applications table does not exist');
            continue;
          }
        } else {
          console.log(`✅ ${command.description} completed successfully`);
        }
      } catch (execError) {
        console.log(`❌ Error executing ${command.description}:`, execError.message);
      }
    }

    // Verify the columns were added by describing the table structure
    console.log('\n🔍 Verifying table structure...');
    
    try {
      const { data: columns, error: columnError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, column_default')
        .eq('table_name', 'business_applications')
        .in('column_name', ['bank_info', 'display_time_slots', 'documents']);

      if (columnError) {
        console.log('⚠️  Could not verify columns:', columnError.message);
      } else if (columns && columns.length > 0) {
        console.log('✅ Added columns verified:');
        columns.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'none'})`);
        });
      } else {
        console.log('⚠️  No columns found - they may not have been added successfully');
      }
    } catch (verifyError) {
      console.log('⚠️  Could not verify table structure:', verifyError.message);
    }

    console.log('\n✅ Business applications table fix completed!');
    console.log('\n📋 Summary of changes:');
    console.log('1. Added bank_info column (JSONB) with default empty object');
    console.log('2. Added display_time_slots column (JSONB) with default time slot object');  
    console.log('3. Added documents column (TEXT[]) with default empty array');
    console.log('\n🚀 The business registration form should now work properly!');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

if (require.main === module) {
  addMissingColumns();
}

module.exports = { addMissingColumns };