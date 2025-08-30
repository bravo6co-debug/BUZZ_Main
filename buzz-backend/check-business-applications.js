const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkBusinessApplicationsTable() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('🔍 Checking business_applications table structure...\n');

  try {
    // Test if the table exists by trying to query it
    console.log('1. Testing table access...');
    const { data: tableTest, error: tableError } = await supabase
      .from('business_applications')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('❌ business_applications table not found or not accessible');
      console.log('Error:', tableError.message);
      return;
    } else {
      console.log('✅ business_applications table exists and is accessible');
      if (tableTest && tableTest.length > 0) {
        console.log(`   Table has ${tableTest.length} existing record(s)`);
      } else {
        console.log('   Table is empty (no records)');
      }
    }

    // Check current columns by trying to insert an empty record (will fail but show us the required columns)
    console.log('\n2. Checking current table structure...');
    const { data: insertTest, error: insertError } = await supabase
      .from('business_applications')
      .insert({})
      .select();
    
    if (insertError) {
      console.log('Current table structure based on error:');
      console.log('Error:', insertError.message);
      
      // Extract column requirements from error message
      if (insertError.message.includes('null value') || insertError.message.includes('violates not-null constraint')) {
        console.log('✅ This error helps us understand the required columns');
      }
    }

    // Try to select all columns to see what exists
    console.log('\n3. Attempting to identify existing columns...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('business_applications')
      .select('*')
      .limit(1);
      
    if (sampleData && sampleData.length > 0) {
      console.log('✅ Sample record found. Existing columns:');
      Object.keys(sampleData[0]).forEach(key => {
        console.log(`   - ${key}: ${typeof sampleData[0][key]}`);
      });
    }

    // Now let's check if our target columns exist by trying to select them specifically
    console.log('\n4. Checking for missing columns...');
    const columnsToCheck = ['bank_info', 'display_time_slots', 'documents'];
    
    for (const column of columnsToCheck) {
      try {
        const { data, error } = await supabase
          .from('business_applications')
          .select(column)
          .limit(1);
          
        if (error) {
          if (error.message.includes('does not exist')) {
            console.log(`❌ Column '${column}' does NOT exist`);
          } else {
            console.log(`⚠️  Column '${column}' - Error: ${error.message}`);
          }
        } else {
          console.log(`✅ Column '${column}' exists`);
        }
      } catch (e) {
        console.log(`❌ Column '${column}' check failed: ${e.message}`);
      }
    }

    console.log('\n🎉 business_applications table check completed!');

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

if (require.main === module) {
  checkBusinessApplicationsTable();
}

module.exports = { checkBusinessApplicationsTable };