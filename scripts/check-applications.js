const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkApplications() {
  console.log('📊 business_applications 테이블 확인 중...\n');
  
  try {
    // 모든 신청서 조회
    const { data: allApplications, error: allError } = await supabase
      .from('business_applications')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.error('조회 오류:', allError);
      return;
    }
    
    console.log(`전체 신청서: ${allApplications?.length || 0}개\n`);
    
    // 상태별 분류
    const byStatus = {};
    allApplications?.forEach(app => {
      byStatus[app.status] = (byStatus[app.status] || 0) + 1;
    });
    
    console.log('상태별 현황:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}개`);
    });
    
    // 최근 5개 신청서 상세 표시
    console.log('\n최근 신청서 5개:');
    allApplications?.slice(0, 5).forEach(app => {
      console.log(`\n  📋 ${app.business_name}`);
      console.log(`     사업자번호: ${app.business_number}`);
      console.log(`     이메일: ${app.email}`);
      console.log(`     상태: ${app.status}`);
      console.log(`     신청일: ${new Date(app.created_at).toLocaleString('ko-KR')}`);
    });
    
    // businesses 테이블 확인
    console.log('\n\n📊 businesses 테이블 확인 중...\n');
    
    const { data: businesses, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (bizError) {
      console.error('조회 오류:', bizError);
    } else {
      console.log(`전체 비즈니스: ${businesses?.length || 0}개\n`);
      
      if (businesses && businesses.length > 0) {
        console.log('최근 비즈니스 3개:');
        businesses.slice(0, 3).forEach(biz => {
          console.log(`\n  🏢 ${biz.business_name || biz.name || 'N/A'}`);
          console.log(`     사업자번호: ${biz.business_number}`);
          console.log(`     owner_id: ${biz.owner_id}`);
          console.log(`     승인상태: ${biz.verification_status || 'N/A'}`);
          console.log(`     활성화: ${biz.is_active}`);
        });
      }
    }
    
  } catch (error) {
    console.error('오류:', error);
  }
}

checkApplications();