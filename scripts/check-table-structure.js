const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableStructure() {
  console.log('📊 테이블 구조 확인 중...\n');
  
  try {
    // businesses 테이블 샘플 데이터 조회
    const { data: businesses, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .limit(1);
    
    if (bizError) {
      console.error('businesses 테이블 조회 오류:', bizError);
    } else {
      console.log('✅ businesses 테이블 컬럼:');
      if (businesses && businesses.length > 0) {
        console.log(Object.keys(businesses[0]));
      } else {
        // 빈 insert로 컬럼 확인
        const { error: insertError } = await supabase
          .from('businesses')
          .insert({})
          .select();
        
        if (insertError) {
          console.log('에러 메시지로 컬럼 추정:', insertError.message);
        }
      }
    }
    
    console.log('\n');
    
    // business_applications 테이블 샘플 데이터 조회
    const { data: applications, error: appError } = await supabase
      .from('business_applications')
      .select('*')
      .limit(1);
    
    if (appError) {
      console.error('business_applications 테이블 조회 오류:', appError);
    } else {
      console.log('✅ business_applications 테이블 컬럼:');
      if (applications && applications.length > 0) {
        console.log(Object.keys(applications[0]));
      }
    }
    
  } catch (error) {
    console.error('오류:', error);
  }
}

checkTableStructure();