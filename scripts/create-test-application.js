const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestApplication() {
  console.log('🚀 테스트 신청서 생성 중...\n');
  
  try {
    // 테스트 신청서 데이터
    const testApplication = {
      business_name: '테스트 카페',
      business_number: '123-45-67890',
      owner_name: '김사장',
      phone: '010-1234-5678',
      email: 'test@example.com',
      category: '카페',
      address: '서울시 강남구 테헤란로 123',
      description: '편안한 분위기의 카페입니다',
      status: 'pending',
      display_time_slots: {
        morning: true,
        lunch: true,
        dinner: true,
        night: false
      }
    };
    
    // business_applications 테이블에 삽입
    const { data, error } = await supabase
      .from('business_applications')
      .insert(testApplication)
      .select()
      .single();
    
    if (error) {
      console.error('❌ 신청서 생성 실패:', error.message);
      console.error('상세 오류:', error);
    } else {
      console.log('✅ 테스트 신청서 생성 완료!');
      console.log('\n생성된 신청서:');
      console.log('  - ID:', data.id);
      console.log('  - 사업자명:', data.business_name);
      console.log('  - 사업자번호:', data.business_number);
      console.log('  - 이메일:', data.email);
      console.log('  - 상태:', data.status);
      console.log('\n이제 buzz-admin에서 이 신청서를 승인할 수 있습니다.');
    }
    
  } catch (error) {
    console.error('예기치 않은 오류:', error);
  }
}

createTestApplication();