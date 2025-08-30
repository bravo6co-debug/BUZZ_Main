const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function verifyBankInfoColumn() {
  console.log('🔍 Verifying bank_info column in business_applications table...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Test 1: Try to select bank_info column
    console.log('1. Testing bank_info column access...');
    const { data: bankInfoTest, error: bankInfoError } = await supabase
      .from('business_applications')
      .select('bank_info')
      .limit(1);
    
    if (bankInfoError) {
      console.log('❌ bank_info column does NOT exist');
      console.log('Error:', bankInfoError.message);
      return { bankInfoExists: false, error: bankInfoError.message };
    } else {
      console.log('✅ bank_info column exists and is accessible');
      console.log('Sample data:', bankInfoTest);
    }

    // Test 2: Try to select all required columns
    console.log('\n2. Testing all required columns...');
    const { data: allColumns, error: allError } = await supabase
      .from('business_applications')
      .select('bank_info, display_time_slots, documents')
      .limit(1);
    
    if (allError) {
      console.log('❌ Some columns are missing');
      console.log('Error:', allError.message);
      return { allColumnsExist: false, error: allError.message };
    } else {
      console.log('✅ All required columns exist:');
      if (allColumns && allColumns.length > 0) {
        const sample = allColumns[0];
        console.log(`   - bank_info: ${typeof sample.bank_info} ${JSON.stringify(sample.bank_info)}`);
        console.log(`   - display_time_slots: ${typeof sample.display_time_slots} ${JSON.stringify(sample.display_time_slots)}`);
        console.log(`   - documents: ${typeof sample.documents} ${JSON.stringify(sample.documents)}`);
      } else {
        console.log('   (No existing records to check data types)');
      }
    }

    // Test 3: Try to insert a test record with all fields
    console.log('\n3. Testing record insertion with all fields...');
    const testData = {
      business_name: 'Test Business',
      business_number: 'TEST-' + Date.now(),
      owner_name: 'Test Owner',
      phone: '010-1234-5678',
      email: 'test-' + Date.now() + '@example.com',
      category: 'restaurant',
      address: 'Test Address',
      description: 'Test Description',
      bank_info: {
        bank_name: '테스트은행',
        account_number: '123-456-789',
        account_holder: '테스트'
      },
      display_time_slots: {
        morning: true,
        lunch: true,
        dinner: false,
        night: false
      },
      documents: ['test-document-1.pdf', 'test-document-2.jpg']
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('business_applications')
      .insert(testData)
      .select()
      .single();

    if (insertError) {
      console.log('❌ Test insertion failed');
      console.log('Error:', insertError.message);
      return { insertTest: false, error: insertError.message };
    } else {
      console.log('✅ Test record inserted successfully');
      console.log('Inserted record ID:', insertResult.id);
      
      // Clean up - delete the test record
      const { error: deleteError } = await supabase
        .from('business_applications')
        .delete()
        .eq('id', insertResult.id);
      
      if (!deleteError) {
        console.log('✅ Test record cleaned up successfully');
      }
    }

    console.log('\n🎉 All tests passed! The business_applications table is ready!');
    console.log('\n📋 Summary:');
    console.log('✅ bank_info column exists (JSONB)');
    console.log('✅ display_time_slots column exists (JSONB)');  
    console.log('✅ documents column exists (array)');
    console.log('✅ Record insertion works with all fields');
    console.log('\n🚀 The business registration form should work properly now!');

    return { 
      success: true, 
      bankInfoExists: true, 
      allColumnsExist: true, 
      insertTest: true 
    };

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  verifyBankInfoColumn();
}

module.exports = { verifyBankInfoColumn };