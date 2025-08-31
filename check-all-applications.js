const { createClient } = require('@supabase/supabase-js');

// Supabase 설정
const supabaseUrl = 'https://ssokfehixfpkbgcghkxy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzb2tmZWhpeGZwa2JnY2doa3h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU0MjA5NywiZXhwIjoyMDcyMTE4MDk3fQ.dv-uD0BUu9pzk-4In56-A5UO3WJSaDVZhs-16Xr9bfQ';

// Service Role 클라이언트
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAllApplications() {
  console.log('========================================');
  console.log('모든 business_applications 조회');
  console.log('========================================\n');
  
  try {
    const { data: applications, error, count } = await supabase
      .from('business_applications')
      .select('*', { count: 'exact' })
      .order('applied_at', { ascending: false });
    
    if (error) {
      console.error('조회 실패:', error);
      return;
    }
    
    console.log(`총 ${count || 0}개의 신청\n`);
    
    if (applications && applications.length > 0) {
      applications.forEach((app, index) => {
        console.log(`${index + 1}. ${app.business_name}`);
        console.log(`   사업자번호: ${app.business_number}`);
        console.log(`   대표자: ${app.owner_name}`);
        console.log(`   전화번호: ${app.phone}`);
        console.log(`   이메일: ${app.email}`);
        console.log(`   상태: ${app.status}`);
        console.log(`   신청일: ${new Date(app.applied_at).toLocaleString('ko-KR')}`);
        if (app.reviewed_at) {
          console.log(`   검토일: ${new Date(app.reviewed_at).toLocaleString('ko-KR')}`);
        }
        console.log('');
      });
      
      // 상태별 집계
      const statusCount = {};
      applications.forEach(app => {
        statusCount[app.status] = (statusCount[app.status] || 0) + 1;
      });
      
      console.log('상태별 집계:');
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}건`);
      });
    } else {
      console.log('신청 데이터가 없습니다.');
    }
    
  } catch (error) {
    console.error('오류 발생:', error);
  }
}

checkAllApplications()
  .then(() => {
    console.log('\n확인 완료!');
    process.exit(0);
  })
  .catch(error => {
    console.error('오류:', error);
    process.exit(1);
  });