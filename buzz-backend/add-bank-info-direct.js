const { Client } = require('pg');
require('dotenv').config();

async function addBankInfoColumn() {
  console.log('🚀 Adding bank_info column using direct PostgreSQL connection...');
  
  // Create PostgreSQL client with connection details from env
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    // Connect to the database
    console.log('🔗 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully');

    // Add the missing bank_info column
    console.log('🔄 Adding bank_info column...');
    const alterSQL = `ALTER TABLE business_applications ADD COLUMN IF NOT EXISTS bank_info JSONB DEFAULT '{}';`;
    
    await client.query(alterSQL);
    console.log('✅ bank_info column added successfully');

    // Verify the column was added
    console.log('🔍 Verifying column was added...');
    const verifySQL = `
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'business_applications' 
        AND column_name = 'bank_info';
    `;
    
    const result = await client.query(verifySQL);
    
    if (result.rows.length > 0) {
      console.log('✅ Verification successful:');
      result.rows.forEach(row => {
        console.log(`   - Column: ${row.column_name}`);
        console.log(`   - Data Type: ${row.data_type}`);
        console.log(`   - Default: ${row.column_default || 'none'}`);
      });
    } else {
      console.log('❌ Column not found after adding');
    }

    // Show all columns in the business_applications table
    console.log('\n📋 All columns in business_applications table:');
    const allColumnsSQL = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'business_applications'
      ORDER BY ordinal_position;
    `;
    
    const allColumns = await client.query(allColumnsSQL);
    allColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'} ${row.column_default ? `[default: ${row.column_default}]` : ''}`);
    });

    console.log('\n✅ bank_info column successfully added to business_applications table!');
    console.log('🚀 The business registration form should now work properly!');

  } catch (error) {
    console.error('❌ Error adding bank_info column:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close the connection
    await client.end();
    console.log('🔐 Database connection closed');
  }
}

if (require.main === module) {
  addBankInfoColumn();
}

module.exports = { addBankInfoColumn };