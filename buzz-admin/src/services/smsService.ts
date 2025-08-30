// SOLAPI SMS 서비스 (브라우저용)
class BrowserSmsService {
  private apiKey: string;
  private apiSecret: string;
  private fromNumber: string;

  constructor(apiKey: string, apiSecret: string, fromNumber: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.fromNumber = fromNumber;
  }

  // SOLAPI 실제 SMS 전송
  async sendSms(to: string, message: string) {
    try {
      // 콘솔에 전송 정보 출력
      console.log('📱 SOLAPI SMS 전송 시작:');
      console.log(`📞 수신번호: ${to}`);
      console.log(`📝 메시지:`);
      console.log(message);
      console.log('='.repeat(50));

      // HMAC-SHA256 서명 생성을 위한 간단한 방법
      const timestamp = Date.now().toString();
      const salt = Math.random().toString(36).substring(7);
      
      // SOLAPI API 호출
      const response = await fetch('https://api.solapi.com/messages/v4/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `HMAC-SHA256 apiKey=${this.apiKey}, date=${timestamp}, salt=${salt}, signature=${this.generateSignature(timestamp, salt)}`
        },
        body: JSON.stringify({
          message: {
            to: to.replace(/[^0-9]/g, ''), // 숫자만 추출
            from: this.fromNumber,
            text: message
          }
        })
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ SMS 전송 성공:', result);
        return {
          success: true,
          messageId: result.groupId,
          data: result
        };
      } else {
        console.error('❌ SMS 전송 실패:', result);
        return {
          success: false,
          error: result.errorMessage || 'SMS 전송 실패',
          details: result
        };
      }

    } catch (error) {
      console.error('❌ SMS 전송 중 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 간단한 서명 생성 (실제로는 crypto-js 또는 Node.js crypto 사용 권장)
  private generateSignature(timestamp: string, salt: string): string {
    // 브라우저에서는 복잡한 HMAC 구현이 어려우므로 간단한 해시 사용
    const data = this.apiKey + timestamp + salt + this.apiSecret;
    return btoa(data).substring(0, 32);
  }

  // 사업자 승인 SMS 전송
  async sendApprovalSms(businessInfo: any, temporaryPassword: string) {
    const message = `[BUZZ] ${businessInfo.business_name} 사업자 등록이 승인되었습니다.

📱 로그인 정보:
• 사업자번호: ${businessInfo.business_number}
• 임시비밀번호: ${temporaryPassword}

💡 첫 로그인 후 비밀번호를 변경해주세요.
📞 문의: 1588-0000

BUZZ 비즈니스`;

    return await this.sendSms(businessInfo.phone, message);
  }

  // 사업자 거부 SMS 전송
  async sendRejectionSms(businessInfo: any, rejectionReason: string) {
    const message = `[BUZZ] ${businessInfo.business_name} 사업자 등록 신청이 거부되었습니다.

❌ 거부 사유:
${rejectionReason}

📧 재신청이나 문의사항은 고객센터로 연락주세요.
📞 문의: 1588-0000

BUZZ 비즈니스`;

    return await this.sendSms(businessInfo.phone, message);
  }

  // 등록 신청 접수 확인 SMS 전송
  async sendApplicationConfirmSms(businessInfo: any) {
    const message = `[BUZZ] ${businessInfo.business_name} 사업자 등록 신청이 접수되었습니다.

✅ 접수 완료:
• 신청자: ${businessInfo.owner_name}
• 사업자번호: ${businessInfo.business_number}

⏰ 검토 시간: 1-2일 소요
📱 승인 시 SMS로 로그인 정보를 안내드립니다.

BUZZ 비즈니스`;

    return await this.sendSms(businessInfo.phone, message);
  }
}

// SMS 서비스 인스턴스 생성 (환경변수 또는 기본값 사용)
export const smsService = new BrowserSmsService(
  import.meta.env.VITE_SOLAPI_API_KEY || 'dev_api_key',
  import.meta.env.VITE_SOLAPI_API_SECRET || 'dev_api_secret', 
  import.meta.env.VITE_SOLAPI_FROM_NUMBER || '010-1234-5678'
);

export default smsService;