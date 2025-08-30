const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function simpleCheck() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Simple check of business_applications table...\n');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get all applications
    console.log('📋 All applications in table:');
    const { data: allApps, error: allError } = await supabase
      .from('business_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('❌ Error fetching applications:', allError.message);
      return;
    }

    if (allApps && allApps.length > 0) {
      console.log(`Total applications found: ${allApps.length}\n`);
      
      // Show all applications with details
      allApps.forEach((app, index) => {
        console.log(`${index + 1}. ${app.business_name}`);
        console.log(`   Business Number: ${app.business_number}`);
        console.log(`   Status: ${app.status || 'NULL/UNDEFINED'}`);
        console.log(`   Created: ${app.created_at}`);
        console.log(`   Updated: ${app.updated_at || 'Not updated'}`);
        console.log('');
      });

      // Count by status
      const statusCounts = {};
      allApps.forEach(app => {
        const status = app.status || 'NULL/UNDEFINED';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      console.log('📊 Status breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });

      // Check for Korean text applications
      const koreanApps = allApps.filter(app => 
        app.business_name && app.business_name.includes('테스트')
      );

      if (koreanApps.length > 0) {
        console.log('\n🇰🇷 Korean test applications found:');
        koreanApps.forEach(app => {
          console.log(`   ${app.business_name} (${app.business_number}) - ${app.status || 'NULL'} - ${app.created_at}`);
        });
      } else {
        console.log('\n❌ No Korean test applications found');
      }

    } else {
      console.log('❌ No applications found in table');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simpleCheck();