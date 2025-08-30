// Buzz-Biz용 SMS 서비스 (간단한 버전)
class BuzzBizSmsService {
  // 등록 신청 접수 확인 SMS 전송 시뮬레이션
  async sendApplicationConfirmSms(businessInfo: any) {
    const message = `[BUZZ] ${businessInfo.business_name} 사업자 등록 신청이 접수되었습니다.

✅ 접수 완료:
• 신청자: ${businessInfo.owner_name}
• 사업자번호: ${businessInfo.business_number}

⏰ 검토 시간: 1-2일 소요
📱 승인 시 SMS로 로그인 정보를 안내드립니다.

BUZZ 비즈니스`;

    // 개발 중에는 콘솔에만 출력
    console.log('📱 접수 확인 SMS 전송 시뮬레이션:');
    console.log(`📞 수신번호: ${businessInfo.phone}`);
    console.log(`📝 메시지:`);
    console.log(message);
    console.log('='.repeat(50));

    return {
      success: true,
      messageId: 'confirm_' + Date.now(),
      message: '접수 확인 SMS 전송 시뮬레이션 완료'
    };
  }
}

export const smsService = new BuzzBizSmsService();
export default smsService;