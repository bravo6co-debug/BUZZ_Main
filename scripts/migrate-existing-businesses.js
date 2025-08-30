/**
 * 기존 승인된 비즈니스 데이터에 대한 Supabase Auth 계정 생성 스크립트
 * 
 * 실행 방법:
 * node scripts/migrate-existing-businesses.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase 클라이언트 설정
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // service role key 필요

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  console.error('VITE_SUPABASE_URL과 SUPABASE_SERVICE_KEY를 .env 파일에 설정해주세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 임시 비밀번호 생성 함수
function generateTempPassword() {
  return Math.random().toString(36).slice(-8).toUpperCase();
}

// 마이그레이션 실행
async function migrateExistingBusinesses() {
  console.log('🚀 기존 비즈니스 마이그레이션 시작...\n');

  try {
    // 1. 승인된 business_applications 조회
    console.log('📋 승인된 비즈니스 신청서 조회 중...');
    const { data: applications, error: fetchError } = await supabase
      .from('business_applications')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`신청서 조회 실패: ${fetchError.message}`);
    }

    if (!applications || applications.length === 0) {
      console.log('ℹ️ 마이그레이션할 승인된 신청서가 없습니다.');
      return;
    }

    console.log(`✅ ${applications.length}개의 승인된 신청서 발견\n`);

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    // 2. 각 신청서에 대해 처리
    for (const application of applications) {
      console.log(`\n처리 중: ${application.business_name} (${application.business_number})`);

      try {
        // 이미 businesses 테이블에 있는지 확인
        const { data: existingBusiness } = await supabase
          .from('businesses')
          .select('id, owner_id')
          .eq('business_number', application.business_number)
          .single();

        if (existingBusiness) {
          // owner_id가 임시 UUID인 경우에만 업데이트
          if (existingBusiness.owner_id === '00000000-0000-0000-0000-000000000000') {
            console.log('  → 임시 user_id 발견, Auth 계정 생성 중...');
            
            // Auth 계정 생성
            const tempPassword = generateTempPassword();
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
              email: application.email,
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                business_name: application.business_name,
                business_number: application.business_number,
                owner_name: application.owner_name,
                phone: application.phone,
                role: 'business_owner',
                needs_password_change: true
              }
            });

            if (authError) {
              // 이미 존재하는 이메일인 경우
              if (authError.message?.includes('already exists')) {
                // 기존 사용자 찾기
                const { data: { users } } = await supabase.auth.admin.listUsers();
                const existingUser = users?.find(u => u.email === application.email);
                
                if (existingUser) {
                  // businesses 테이블 업데이트
                  await supabase
                    .from('businesses')
                    .update({ 
                      owner_id: existingUser.id  // user_id 대신 owner_id 사용
                    })
                    .eq('id', existingBusiness.id);
                  
                  console.log('  ✅ 기존 Auth 계정과 연결됨');
                  results.success.push(application.business_name);
                } else {
                  throw new Error('기존 사용자를 찾을 수 없음');
                }
              } else {
                throw authError;
              }
            } else {
              // businesses 테이블 업데이트
              await supabase
                .from('businesses')
                .update({ 
                  owner_id: authData.user.id  // user_id 대신 owner_id 사용
                })
                .eq('id', existingBusiness.id);

              console.log(`  ✅ Auth 계정 생성 완료 (임시 비밀번호: ${tempPassword})`);
              results.success.push({
                name: application.business_name,
                email: application.email,
                tempPassword: tempPassword
              });
            }
          } else {
            console.log('  ⏭️ 이미 Auth 계정이 연결되어 있음');
            results.skipped.push(application.business_name);
          }
        } else {
          // businesses 테이블에 없는 경우 - 새로 생성
          console.log('  → businesses 테이블에 없음, 새로 생성 중...');
          
          const tempPassword = generateTempPassword();
          
          // Auth 계정 생성
          let userId;
          
          // 먼저 기존 사용자 확인
          const { data: { users } } = await supabase.auth.admin.listUsers();
          const existingUser = users?.find(u => u.email === application.email);
          
          if (existingUser) {
            console.log('  → 기존 Auth 계정 발견, 연결 중...');
            userId = existingUser.id;
          } else {
            // 새 사용자 생성
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
              email: application.email,
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                business_name: application.business_name,
                business_number: application.business_number,
                owner_name: application.owner_name,
                phone: application.phone,
                role: 'business_owner',
                needs_password_change: true
              }
            });

            if (authError) {
              throw authError;
            }
            
            userId = authData.user.id;
            console.log(`  → 새 Auth 계정 생성 (임시 비밀번호: ${tempPassword})`);
          }

          // businesses 테이블에 삽입 (owner_id 사용)
          const insertData = {
            owner_id: userId,  // user_id 대신 owner_id 사용
            business_name: application.business_name,  // business_name 필수
            business_number: application.business_number,
            category: application.category,
            address: application.address,
            phone: application.phone,
            verification_status: 'approved'
          };
          
          // 선택적 필드들 - 존재하는 경우에만 추가
          if (application.description) insertData.description = application.description;
          
          const { error: insertError } = await supabase
            .from('businesses')
            .insert(insertData);

          if (insertError) {
            throw insertError;
          }

          if (existingUser) {
            console.log(`  ✅ 기존 Auth 계정과 비즈니스 연결 완료`);
            results.success.push(application.business_name);
          } else {
            console.log(`  ✅ 새 비즈니스 및 Auth 계정 생성 완료 (임시 비밀번호: ${tempPassword})`);
            results.success.push({
              name: application.business_name,
              email: application.email,
              tempPassword: tempPassword
            });
          }
        }
      } catch (error) {
        console.error(`  ❌ 처리 실패: ${error.message}`);
        results.failed.push({
          name: application.business_name,
          error: error.message
        });
      }
    }

    // 3. 결과 출력
    console.log('\n' + '='.repeat(60));
    console.log('📊 마이그레이션 완료 결과:\n');
    
    console.log(`✅ 성공: ${results.success.length}개`);
    if (results.success.length > 0) {
      results.success.forEach(item => {
        if (typeof item === 'object') {
          console.log(`   - ${item.name} (${item.email}) - 임시 비밀번호: ${item.tempPassword}`);
        } else {
          console.log(`   - ${item}`);
        }
      });
    }

    console.log(`\n⏭️ 건너뜀: ${results.skipped.length}개`);
    if (results.skipped.length > 0) {
      results.skipped.forEach(name => {
        console.log(`   - ${name}`);
      });
    }

    console.log(`\n❌ 실패: ${results.failed.length}개`);
    if (results.failed.length > 0) {
      results.failed.forEach(item => {
        console.log(`   - ${item.name}: ${item.error}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    
    // 임시 비밀번호가 생성된 경우 CSV 파일로 저장
    const newAccounts = results.success.filter(item => typeof item === 'object');
    if (newAccounts.length > 0) {
      const csv = 'Business Name,Email,Temporary Password\n' + 
        newAccounts.map(item => `"${item.name}","${item.email}","${item.tempPassword}"`).join('\n');
      
      const fs = require('fs');
      const filename = `migration-passwords-${Date.now()}.csv`;
      fs.writeFileSync(filename, csv);
      console.log(`\n💾 임시 비밀번호가 ${filename} 파일로 저장되었습니다.`);
      console.log('⚠️ 보안을 위해 이 파일을 안전한 곳에 보관하고, 사용자에게 전달 후 삭제하세요.');
    }

  } catch (error) {
    console.error('\n❌ 마이그레이션 중 오류 발생:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
migrateExistingBusinesses()
  .then(() => {
    console.log('\n✨ 마이그레이션 프로세스 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 예기치 않은 오류:', error);
    process.exit(1);
  });