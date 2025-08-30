const axios = require('axios');

class SolapiSmsService {
  constructor(apiKey, apiSecret, fromNumber) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.fromNumber = fromNumber;
    this.baseUrl = 'https://api.solapi.com';
  }

  // 인증 헤더 생성
  getAuthHeaders() {
    const timestamp = new Date().getTime().toString();
    return {
      'Content-Type': 'application/json',
      'Authorization': `HMAC-SHA256 apiKey=${this.apiKey}, date=${timestamp}, salt=${timestamp}, signature=${this.generateSignature(timestamp)}`
    };
  }

  // HMAC 서명 생성 (실제 구현에서는 crypto 모듈 사용)
  generateSignature(timestamp) {
    // 간단한 버전 - 실제로는 HMAC-SHA256으로 서명 생성
    return Buffer.from(`${this.apiKey}${timestamp}${this.apiSecret}`).toString('base64');
  }

  // 단일 SMS 전송
  async sendSms(to, message) {
    try {
      const payload = {
        message: {
          to: to.replace(/[^0-9]/g, ''), // 숫자만 추출
          from: this.fromNumber,
          text: message
        }
      };

      console.log(`📱 SMS 전송 시작: ${to}`);
      console.log(`📝 메시지: ${message}`);

      const response = await axios.post(
        `${this.baseUrl}/messages/v4/send`,
        payload,
        {
          headers: this.getAuthHeaders(),
          timeout: 10000
        }
      );

      console.log('✅ SMS 전송 성공:', response.data);
      return {
        success: true,
        messageId: response.data.groupId,
        data: response.data
      };

    } catch (error) {
      console.error('❌ SMS 전송 실패:', error.message);
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  // 사업자 승인 SMS 전송
  async sendApprovalSms(businessInfo, temporaryPassword) {
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
  async sendRejectionSms(businessInfo, rejectionReason) {
    const message = `[BUZZ] ${businessInfo.business_name} 사업자 등록 신청이 거부되었습니다.

❌ 거부 사유:
${rejectionReason}

📧 재신청이나 문의사항은 고객센터로 연락주세요.
📞 문의: 1588-0000

BUZZ 비즈니스`;

    return await this.sendSms(businessInfo.phone, message);
  }

  // 등록 신청 접수 확인 SMS 전송
  async sendApplicationConfirmSms(businessInfo) {
    const message = `[BUZZ] ${businessInfo.business_name} 사업자 등록 신청이 접수되었습니다.

✅ 접수 완료:
• 신청자: ${businessInfo.owner_name}
• 사업자번호: ${businessInfo.business_number}

⏰ 검토 시간: 1-2일 소요
📱 승인 시 SMS로 로그인 정보를 안내드립니다.

BUZZ 비즈니스`;

    return await this.sendSms(businessInfo.phone, message);
  }

  // 비밀번호 재설정 SMS 전송
  async sendPasswordResetSms(phone, newPassword) {
    const message = `[BUZZ] 비밀번호가 재설정되었습니다.

🔑 새로운 비밀번호: ${newPassword}

💡 로그인 후 반드시 비밀번호를 변경해주세요.
📞 문의: 1588-0000

BUZZ 비즈니스`;

    return await this.sendSms(phone, message);
  }
}

// 환경변수에서 설정값 읽기
const smsService = new SolapiSmsService(
  process.env.SOLAPI_API_KEY || 'YOUR_API_KEY',
  process.env.SOLAPI_API_SECRET || 'YOUR_API_SECRET',
  process.env.SOLAPI_FROM_NUMBER || '02-1234-5678'
);

module.exports = {
  SolapiSmsService,
  smsService
};