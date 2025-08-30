import QRCode from 'qrcode';
import { log } from './logger';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export interface DiscountQRData {
  type: 'discount';
  code: string;
  discount: number;
  validUntil: Date;
  businessId?: number;
}

export interface MileageQRData {
  type: 'mileage';
  userId: number;
  amount: number;
  transactionId: string;
}

/**
 * Generate QR code for discount coupon
 */
export async function generateDiscountQR(
  data: DiscountQRData,
  options?: QRCodeOptions
): Promise<string> {
  try {
    const qrData = JSON.stringify({
      ...data,
      validUntil: data.validUntil.toISOString(),
      generatedAt: new Date().toISOString()
    });

    const qrOptions = {
      width: options?.width || 400,
      margin: options?.margin || 2,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF'
      },
      errorCorrectionLevel: options?.errorCorrectionLevel || 'M'
    };

    const qrCodeDataURL = await QRCode.toDataURL(qrData, qrOptions);
    
    log.info('Generated discount QR code', { code: data.code });
    
    return qrCodeDataURL;
  } catch (error) {
    log.error('Error generating discount QR code', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code for mileage transaction
 */
export async function generateMileageQR(
  data: MileageQRData,
  options?: QRCodeOptions
): Promise<string> {
  try {
    const qrData = JSON.stringify({
      ...data,
      generatedAt: new Date().toISOString()
    });

    const qrOptions = {
      width: options?.width || 300,
      margin: options?.margin || 2,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF'
      },
      errorCorrectionLevel: options?.errorCorrectionLevel || 'M'
    };

    const qrCodeDataURL = await QRCode.toDataURL(qrData, qrOptions);
    
    log.info('Generated mileage QR code', { transactionId: data.transactionId });
    
    return qrCodeDataURL;
  } catch (error) {
    log.error('Error generating mileage QR code', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate unique discount code
 */
export function generateDiscountCode(prefix: string = 'BUZZ-DC'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix + '-';
  
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}

/**
 * Validate discount code format
 */
export function validateDiscountCode(code: string): boolean {
  const pattern = /^BUZZ-DC-[A-Z0-9]{5}$/;
  return pattern.test(code);
}

/**
 * Generate QR code HTML for display
 */
export function generateQRHTML(qrData: DiscountQRData): string {
  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BUZZ 할인 QR코드</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: white;
          border-radius: 20px;
          padding: 40px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 48px;
          margin-bottom: 10px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          color: #333;
          margin: 0;
        }
        .discount-badge {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-size: 32px;
          font-weight: bold;
          padding: 15px 30px;
          border-radius: 50px;
          display: inline-block;
          margin: 20px 0;
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
        }
        .qr-container {
          background: #f9fafb;
          border-radius: 15px;
          padding: 20px;
          margin: 20px 0;
          text-align: center;
        }
        .qr-image {
          max-width: 250px;
          width: 100%;
          height: auto;
        }
        .code-display {
          background: #f3f4f6;
          border: 2px dashed #d1d5db;
          border-radius: 10px;
          padding: 15px;
          margin: 20px 0;
          font-family: 'Courier New', monospace;
          font-size: 18px;
          font-weight: bold;
          color: #374151;
          letter-spacing: 1px;
        }
        .validity {
          background: #fef3c7;
          border: 1px solid #fbbf24;
          border-radius: 10px;
          padding: 12px;
          margin: 20px 0;
          color: #92400e;
          font-size: 14px;
        }
        .instructions {
          background: #eff6ff;
          border: 1px solid #93c5fd;
          border-radius: 10px;
          padding: 15px;
          margin-top: 20px;
        }
        .instructions-title {
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 10px;
        }
        .instructions-list {
          list-style: none;
          padding: 0;
          margin: 0;
          color: #3730a3;
          font-size: 14px;
        }
        .instructions-list li {
          padding: 5px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #6b7280;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎯</div>
          <h1 class="title">BUZZ 할인 쿠폰</h1>
        </div>
        
        <div style="text-align: center;">
          <div class="discount-badge">${qrData.discount}% 할인</div>
        </div>
        
        <div class="qr-container">
          <div id="qr-code-placeholder" style="width: 250px; height: 250px; margin: 0 auto; background: #e5e7eb; display: flex; align-items: center; justify-content: center; border-radius: 10px;">
            <span style="color: #9ca3af;">QR Code</span>
          </div>
        </div>
        
        <div class="code-display">
          ${qrData.code}
        </div>
        
        <div class="validity">
          ⏰ 유효기간: ${new Date(qrData.validUntil).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}까지
        </div>
        
        <div class="instructions">
          <div class="instructions-title">사용 방법</div>
          <ul class="instructions-list">
            <li>1️⃣ 매장에서 결제 시 QR코드를 제시하세요</li>
            <li>2️⃣ 직원이 QR코드를 스캔하면 할인이 적용됩니다</li>
            <li>3️⃣ 한 번 사용하면 자동으로 소멸됩니다</li>
          </ul>
        </div>
        
        <div class="footer">
          이 쿠폰은 BUZZ 제휴 매장에서만 사용 가능합니다
        </div>
      </div>
    </body>
    </html>
  `;
}