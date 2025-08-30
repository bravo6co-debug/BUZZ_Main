const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function approveTestApplication() {
  console.log('🚀 테스트 신청서 승인 처리 중...\n');
  
  try {
    // pending 상태의 신청서 찾기
    const { data: applications, error: fetchError } = await supabase
      .from('business_applications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (fetchError) {
      console.error('신청서 조회 실패:', fetchError);
      return;
    }
    
    if (!applications || applications.length === 0) {
      console.log('승인 대기 중인 신청서가 없습니다.');
      return;
    }
    
    const application = applications[0];
    console.log(`신청서 발견: ${application.business_name} (${application.business_number})`);
    
    // 승인 처리
    const { error: updateError } = await supabase
      .from('business_applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', application.id);
    
    if (updateError) {
      console.error('승인 처리 실패:', updateError);
    } else {
      console.log('✅ 신청서 승인 완료!');
      console.log('\n승인된 신청서:');
      console.log('  - 사업자명:', application.business_name);
      console.log('  - 사업자번호:', application.business_number);
      console.log('  - 이메일:', application.email);
      console.log('\n이제 마이그레이션 스크립트를 실행할 수 있습니다.');
    }
    
  } catch (error) {
    console.error('예기치 않은 오류:', error);
  }
}

approveTestApplication();