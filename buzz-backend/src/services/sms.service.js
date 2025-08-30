const { SolapiMessageService } = require('solapi');
require('dotenv').config();

// SolAPI 클라이언트 설정
const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY || '',
  process.env.SOLAPI_API_SECRET || ''
);

/**
 * SMS 전송 함수
 * @param {string} to - 수신 전화번호 (01012345678 형태)
 * @param {string} message - 전송할 메시지
 * @param {string} from - 발신 전화번호 (선택, 환경변수 SOLAPI_SENDER 사용)
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
const sendSMS = async (to, message, from = null) => {
  try {
    // 전화번호 형식 정리 (하이픈 제거)
    const cleanTo = to.replace(/[^0-9]/g, '');
    const cleanFrom = from ? from.replace(/[^0-9]/g, '') : process.env.SOLAPI_SENDER;

    // 환경변수 체크
    if (!process.env.SOLAPI_API_KEY || !process.env.SOLAPI_API_SECRET) {
      console.error('SolAPI credentials not configured');
      return {
        success: false,
        error: 'SMS 서비스 설정이 완료되지 않았습니다'
      };
    }

    if (!cleanFrom) {
      return {
        success: false,
        error: '발신 전화번호가 설정되지 않았습니다'
      };
    }

    // SMS 전송 데이터
    const messageData = {
      to: cleanTo,
      from: cleanFrom,
      text: message
    };

    console.log(`Sending SMS to ${cleanTo}: ${message.substring(0, 30)}...`);

    // SolAPI를 통해 SMS 전송
    const response = await messageService.send(messageData);

    console.log('SMS sent successfully:', response.messageId);

    return {
      success: true,
      data: {
        messageId: response.messageId,
        to: cleanTo,
        from: cleanFrom,
        message: message,
        sentAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('SMS send error:', error);

    // SolAPI 특정 에러 처리
    if (error.errorCode) {
      return {
        success: false,
        error: `SMS 전송 실패: ${error.errorMessage || error.message}`,
        details: {
          errorCode: error.errorCode,
          errorMessage: error.errorMessage
        }
      };
    }

    return {
      success: false,
      error: `SMS 전송 중 오류가 발생했습니다: ${error.message}`
    };
  }
};

/**
 * 사업자 승인 SMS 전송
 * @param {string} phoneNumber - 수신 전화번호
 * @param {string} businessName - 사업자명
 * @param {string} tempPassword - 임시 비밀번호
 */
const sendBusinessApprovalSMS = async (phoneNumber, businessName, tempPassword) => {
  const message = `[BUZZ] ${businessName} 사업자 등록이 승인되었습니다! 임시비밀번호: ${tempPassword}로 로그인 후 비밀번호를 변경해주세요. buzzplatform.kr`;
  
  return sendSMS(phoneNumber, message);
};

/**
 * 사업자 반려 SMS 전송
 * @param {string} phoneNumber - 수신 전화번호
 * @param {string} businessName - 사업자명
 * @param {string} reason - 반려 사유
 */
const sendBusinessRejectionSMS = async (phoneNumber, businessName, reason) => {
  const message = `[BUZZ] ${businessName} 사업자 등록이 반려되었습니다. 사유: ${reason} 자세한 문의는 고객센터 1588-0000으로 연락주세요.`;
  
  return sendSMS(phoneNumber, message);
};

/**
 * 사업자 신청 접수 SMS 전송 (선택사항)
 * @param {string} phoneNumber - 수신 전화번호
 * @param {string} businessName - 사업자명
 */
const sendBusinessApplicationSMS = async (phoneNumber, businessName) => {
  const message = `[BUZZ] ${businessName} 사업자 등록 신청이 접수되었습니다. 심사 결과는 영업일 기준 1-3일 내에 SMS로 안내드립니다.`;
  
  return sendSMS(phoneNumber, message);
};

/**
 * 임시 비밀번호 생성
 * @param {number} length - 비밀번호 길이 (기본 8자리)
 * @returns {string} 임시 비밀번호
 */
const generateTempPassword = (length = 8) => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return password;
};

/**
 * SMS 서비스 상태 확인
 */
const checkSMSService = async () => {
  try {
    if (!process.env.SOLAPI_API_KEY || !process.env.SOLAPI_API_SECRET) {
      return {
        success: false,
        error: 'SolAPI 인증 정보가 설정되지 않았습니다'
      };
    }

    if (!process.env.SOLAPI_SENDER) {
      return {
        success: false,
        error: '발신 전화번호가 설정되지 않았습니다'
      };
    }

    // 실제 SMS 전송 없이 설정만 확인
    return {
      success: true,
      data: {
        configured: true,
        sender: process.env.SOLAPI_SENDER,
        status: 'ready'
      }
    };

  } catch (error) {
    return {
      success: false,
      error: `SMS 서비스 확인 중 오류: ${error.message}`
    };
  }
};

module.exports = {
  sendSMS,
  sendBusinessApprovalSMS,
  sendBusinessRejectionSMS,
  sendBusinessApplicationSMS,
  generateTempPassword,
  checkSMSService
};