const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function addBankInfoColumn() {
  console.log('🚀 Adding bank_info column using Supabase client...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // First, let's verify current state
    console.log('🔍 Checking current table structure...');
    
    // Try to query bank_info column specifically
    const { data: bankInfoCheck, error: bankInfoError } = await supabase
      .from('business_applications')
      .select('bank_info')
      .limit(1);
    
    if (!bankInfoError) {
      console.log('✅ bank_info column already exists!');
      console.log('Data from bank_info column:', bankInfoCheck);
      return;
    } else if (bankInfoError.message.includes('does not exist')) {
      console.log('❌ Confirmed: bank_info column does not exist');
      console.log('Proceeding to add it...');
    } else {
      console.log('⚠️  Unexpected error:', bankInfoError.message);
    }

    // Let's try adding the column using a different method
    // Since we can successfully query the table, let's try using the sql function if it exists
    console.log('🔧 Attempting to add bank_info column...');
    
    // Method 1: Try using the SQL function
    try {
      const { data: sqlResult, error: sqlError } = await supabase.functions.invoke('sql', {
        body: { 
          query: "ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS bank_info JSONB DEFAULT '{}';" 
        }
      });
      
      if (!sqlError) {
        console.log('✅ Method 1: SQL function succeeded');
        console.log('Result:', sqlResult);
      } else {
        throw new Error('SQL function not available');
      }
    } catch (funcError) {
      console.log('⚠️  Method 1 failed: SQL function not available');
      
      // Method 2: Try using RPC with different function names
      console.log('🔧 Trying Method 2: RPC with exec_sql...');
      try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('exec_sql', {
          sql: "ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS bank_info JSONB DEFAULT '{}';"
        });
        
        if (!rpcError) {
          console.log('✅ Method 2: RPC exec_sql succeeded');
        } else {
          throw new Error('RPC exec_sql failed: ' + rpcError.message);
        }
      } catch (rpcError) {
        console.log('⚠️  Method 2 failed:', rpcError.message);
        
        // Method 3: Try creating an SQL file and inform user
        console.log('🔧 Method 3: Creating SQL file for manual execution...');
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 MANUAL EXECUTION REQUIRED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('Please execute the following SQL command manually in your Supabase SQL Editor:');
        console.log('');
        console.log('1. Go to https://supabase.com/dashboard/project/[your-project]/sql');
        console.log('2. Execute this SQL command:');
        console.log('');
        console.log('   ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS bank_info JSONB DEFAULT \'{}\';');
        console.log('');
        console.log('3. Verify with:');
        console.log('');
        console.log('   SELECT column_name, data_type, column_default');
        console.log('   FROM information_schema.columns');
        console.log('   WHERE table_name = \'business_applications\' AND column_name = \'bank_info\';');
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
    }

    // Verify if the column was added (regardless of method)
    console.log('🔍 Verifying if column was added...');
    
    const { data: finalCheck, error: finalError } = await supabase
      .from('business_applications')
      .select('bank_info')
      .limit(1);
    
    if (!finalError) {
      console.log('✅ SUCCESS: bank_info column is now available!');
      console.log('Sample data:', finalCheck);
    } else {
      console.log('❌ Column still not available. Manual execution required.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

if (require.main === module) {
  addBankInfoColumn();
}

module.exports = { addBankInfoColumn };