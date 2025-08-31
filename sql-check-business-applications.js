const { createClient } = require('@supabase/supabase-js');

// Supabase 설정
const supabaseUrl = 'https://ssokfehixfpkbgcghkxy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzb2tmZWhpeGZwa2JnY2doa3h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU0MjA5NywiZXhwIjoyMDcyMTE4MDk3fQ.dv-uD0BUu9pzk-4In56-A5UO3WJSaDVZhs-16Xr9bfQ';

// Service Role 클라이언트
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function sqlCheckBusinessApplications() {
  console.log('========================================');
  console.log('SQL 쿼리를 통한 business_applications 현황 분석');
  console.log('========================================\n');
  
  try {
    // 1. 전체 개수와 상태별 집계 - 단일 쿼리로 처리
    console.log('1. 상태별 집계 쿼리 실행...');
    
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM business_applications 
      GROUP BY status
      ORDER BY count DESC
    `;
    
    const { data: statusCounts, error: statusError } = await supabase.rpc('sql_query', {
      sql: statusQuery
    });
    
    if (statusError) {
      console.log('RPC 함수를 사용할 수 없습니다. 대신 일반 쿼리를 사용합니다.');
      
      // 대안: 각 상태별로 개별 조회
      const pendingCount = await supabase
        .from('business_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
        
      const reviewingCount = await supabase
        .from('business_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'reviewing');
        
      const approvedCount = await supabase
        .from('business_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');
        
      const rejectedCount = await supabase
        .from('business_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected');
        
      const totalCount = await supabase
        .from('business_applications')
        .select('*', { count: 'exact', head: true });
      
      console.log('   상태별 개수:');
      console.log(`   pending: ${pendingCount.count || 0}건`);
      console.log(`   reviewing: ${reviewingCount.count || 0}건`);
      console.log(`   approved: ${approvedCount.count || 0}건`);
      console.log(`   rejected: ${rejectedCount.count || 0}건`);
      console.log(`   전체: ${totalCount.count || 0}건\n`);
      
      // 2. pending과 reviewing 상태의 상세 정보
      console.log('2. 승인 대기 중인 사업자 (pending + reviewing):');
      
      const { data: pendingApps } = await supabase
        .from('business_applications')
        .select('business_name, business_number, owner_name, phone, status, applied_at')
        .in('status', ['pending', 'reviewing'])
        .order('applied_at', { ascending: false });
      
      if (pendingApps && pendingApps.length > 0) {
        pendingApps.forEach((app, index) => {
          console.log(`   ${index + 1}. ${app.business_name} (${app.business_number})`);
          console.log(`      대표자: ${app.owner_name}`);
          console.log(`      연락처: ${app.phone}`);
          console.log(`      상태: ${app.status}`);
          console.log(`      신청일: ${new Date(app.applied_at).toLocaleString('ko-KR')}`);
          console.log('');
        });
      } else {
        console.log('   승인 대기 중인 사업자가 없습니다.\n');
      }
      
      // 3. 오늘 신청한 사업자들
      console.log('3. 오늘 신청한 사업자들:');
      const today = new Date().toISOString().split('T')[0];
      
      const { data: todayApps } = await supabase
        .from('business_applications')
        .select('business_name, business_number, status, applied_at')
        .gte('applied_at', `${today}T00:00:00.000Z`)
        .order('applied_at', { ascending: false });
      
      if (todayApps && todayApps.length > 0) {
        console.log(`   오늘 신청한 사업자: ${todayApps.length}개`);
        todayApps.forEach((app, index) => {
          console.log(`   ${index + 1}. ${app.business_name} (${app.business_number}) - ${app.status}`);
        });
      } else {
        console.log('   오늘 신청한 사업자가 없습니다.');
      }
      
      console.log('\n========================================');
      console.log('요약');
      console.log('========================================');
      console.log(`전체 business_applications: ${totalCount.count || 0}개`);
      console.log(`승인된 사업자: ${approvedCount.count || 0}개`);
      console.log(`승인 대기 (pending + reviewing): ${(pendingCount.count || 0) + (reviewingCount.count || 0)}개`);
      console.log(`거절된 사업자: ${rejectedCount.count || 0}개`);
      
      // 50개 사업자 목표 대비 상황
      const expectedTotal = 50;
      const actualTotal = totalCount.count || 0;
      const missing = Math.max(0, expectedTotal - actualTotal + 4); // 4개는 예상 외 신청
      
      console.log(`\n목표 대비 현황:`);
      console.log(`목표 사업자 수: ${expectedTotal}개`);
      console.log(`실제 등록된 수: ${actualTotal}개`);
      
      if (actualTotal >= expectedTotal) {
        console.log('✅ 목표 달성! (추가 사업자 포함)');
      } else {
        console.log(`❌ ${missing}개 사업자 부족`);
      }
    }
    
  } catch (error) {
    console.error('오류 발생:', error);
  }
}

// 실행
sqlCheckBusinessApplications()
  .then(() => {
    console.log('\nSQL 분석 완료!');
    process.exit(0);
  })
  .catch(error => {
    console.error('오류:', error);
    process.exit(1);
  });