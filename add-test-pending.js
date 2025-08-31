const { createClient } = require('@supabase/supabase-js');

// Supabase 설정
const supabaseUrl = 'https://ssokfehixfpkbgcghkxy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzb2tmZWhpeGZwa2JnY2doa3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NDIwOTcsImV4cCI6MjA3MjExODA5N30.U8DM6l6_P-cDMzAIZab_xZ3RlD80IshB3YGFkBt5K2g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addTestPending() {
  console.log('테스트용 pending 신청 추가...\n');
  
  const testBusiness = {
    business_number: '999-88-77777',
    business_name: '테스트 레스토랑 ADMIN',
    owner_name: '관리자테스트',
    phone: '010-9999-8888'
  };
  
  try {
    const email = `${testBusiness.business_number.replace(/-/g, '')}@buzz.biz`;
    
    const { data, error } = await supabase
      .from('business_applications')
      .insert({
        business_number: testBusiness.business_number,
        business_name: testBusiness.business_name,
        owner_name: testBusiness.owner_name,
        phone: testBusiness.phone,
        email: email,
        category: '테스트',
        address: '서울시 테스트구',
        status: 'pending',
        applied_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('추가 실패:', error.message);
    } else {
      console.log('✅ 테스트 신청 추가 성공!');
      console.log(`   ${testBusiness.business_name} (${testBusiness.business_number})`);
      console.log('\nbuzz-admin에서 승인 대기 숫자가 5로 변경되었는지 확인하세요.');
      console.log('(30초 후 자동 새로고침되거나, 페이지를 새로고침하세요)');
    }
    
  } catch (error) {
    console.error('오류 발생:', error);
  }
}

addTestPending()
  .then(() => {
    console.log('\n완료!');
    process.exit(0);
  })
  .catch(error => {
    console.error('오류:', error);
    process.exit(1);
  });