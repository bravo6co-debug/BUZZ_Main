import { useState } from 'react';
import { Button } from './ui/button';

interface QRScreenProps {
  onBack?: () => void;
}

export function QRScreen({ onBack }: QRScreenProps) {
  const [isScanning, setIsScanning] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<any>(null);

  // 시뮬레이션용 QR 데이터 (3가지 타입 랜덤)
  const getRandomQRData = () => {
    const randomType = Math.floor(Math.random() * 3);
    
    if (randomType === 0) {
      // 기본 할인쿠폰
      return {
        type: 'coupon',
        subType: 'basic',
        couponInfo: {
          title: '기본 할인쿠폰',
          description: '전 메뉴 15% 할인',
          discountType: 'percentage',
          discountValue: 15,
          minOrderAmount: 5000,
          validUntil: '2024-12-31',
          terms: ['1일 1회 사용 가능', '다른 할인과 중복 불가', '최소 주문금액 5,000원 이상'],
          category: 'basic'
        }
      };
    } else if (randomType === 1) {
      // 이벤트 할인쿠폰
      return {
        type: 'coupon',
        subType: 'event',
        couponInfo: {
          title: '🎉 특별 이벤트 쿠폰',
          description: '전 메뉴 30% 할인',
          discountType: 'percentage',
          discountValue: 30,
          minOrderAmount: 15000,
          validUntil: '2024-09-30',
          terms: ['이벤트 기간 한정', '1인 1회 사용 가능', '최소 주문금액 15,000원 이상'],
          category: 'event'
        }
      };
    } else {
      // 마일리지 사용
      return {
        type: 'mileage',
        customerInfo: {
          name: '김○○',
          phone: '010-1234-****',
          mileage: 15000
        }
      };
    }
  };

  const handleScanComplete = () => {
    setIsScanning(false);
    setCustomerInfo(getRandomQRData());
  };

  if (!isScanning && customerInfo) {
    if (customerInfo.type === 'coupon') {
      return <CouponConfirmScreen couponData={customerInfo} onBack={() => setIsScanning(true)} />;
    } else {
      return <CustomerConfirmScreen customerInfo={customerInfo.customerInfo} onBack={() => setIsScanning(true)} />;
    }
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <h1 className="mb-6">📸 QR 코드 스캔</h1>
      
      {/* 카메라 뷰파인더 */}
      <div className="flex-1 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center mb-6">
        <div className="text-center space-y-4">
          <div className="w-32 h-32 border-4 border-primary rounded-lg mx-auto relative">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary"></div>
          </div>
          <p className="text-gray-600">QR 코드를 화면에<br />맞춰 주세요</p>
        </div>
      </div>

      {/* 스캔 가능한 QR 정보 */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="mb-2">💡 스캔 가능한 QR:</h3>
        <ul className="space-y-1 text-sm">
          <li>🎟️ 기본 할인쿠폰</li>
          <li>🎉 이벤트 할인쿠폰</li>
          <li>💰 마일리지 사용</li>
        </ul>
      </div>

      {/* 시뮬레이션 버튼 */}
      <div className="space-y-2">
        <Button onClick={handleScanComplete} className="w-full">
          QR 스캔 시뮬레이션 (랜덤)
        </Button>
        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setIsScanning(false);
              setCustomerInfo({
                type: 'coupon',
                subType: 'basic',
                couponInfo: {
                  title: '기본 할인쿠폰',
                  description: '전 메뉴 15% 할인',
                  discountType: 'percentage',
                  discountValue: 15,
                  minOrderAmount: 5000,
                  validUntil: '2024-12-31',
                  terms: ['1일 1회 사용 가능', '다른 할인과 중복 불가'],
                  category: 'basic'
                }
              });
            }}
            className="text-xs p-2"
          >
            기본쿠폰
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setIsScanning(false);
              setCustomerInfo({
                type: 'coupon',
                subType: 'event',
                couponInfo: {
                  title: '🎉 특별 이벤트 쿠폰',
                  description: '전 메뉴 30% 할인',
                  discountType: 'percentage',
                  discountValue: 30,
                  minOrderAmount: 15000,
                  validUntil: '2024-09-30',
                  terms: ['이벤트 기간 한정', '1인 1회 사용 가능'],
                  category: 'event'
                }
              });
            }}
            className="text-xs p-2"
          >
            이벤트쿠폰
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setIsScanning(false);
              setCustomerInfo({
                type: 'mileage',
                customerInfo: {
                  name: '김○○',
                  phone: '010-1234-****',
                  mileage: 15000
                }
              });
            }}
            className="text-xs p-2"
          >
            마일리지
          </Button>
        </div>
      </div>
    </div>
  );
}

interface CustomerConfirmScreenProps {
  customerInfo: any;
  onBack: () => void;
}

function CustomerConfirmScreen({ customerInfo, onBack }: CustomerConfirmScreenProps) {
  const [amount, setAmount] = useState('');

  const handleNumberClick = (num: string) => {
    if (num === '←') {
      setAmount(prev => prev.slice(0, -1));
    } else if (num === '전액사용') {
      setAmount(customerInfo.mileage.toString());
    } else {
      setAmount(prev => prev + num);
    }
  };

  const quickAmounts = [1000, 3000, 5000];

  return (
    <div className="p-4 h-full flex flex-col">
      <h1 className="mb-6">✅ 고객 정보 확인</h1>
      
      {/* 고객 정보 */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="space-y-2">
          <div>👤 {customerInfo.name}님 ({customerInfo.phone})</div>
          <div>💰 보유 마일리지: {customerInfo.mileage.toLocaleString()}원</div>
        </div>
      </div>

      {/* 금액 입력 */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <h3 className="mb-4">💳 사용할 금액을 입력하세요</h3>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <input
            type="text"
            value={amount ? parseInt(amount).toLocaleString() : ''}
            readOnly
            className="w-full text-center text-xl bg-transparent"
            placeholder="0"
          />
        </div>

        {/* 숫자 키패드 */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[1, 2, 3].map(num => (
            <Button key={num} variant="outline" onClick={() => handleNumberClick(num.toString())}>{num}</Button>
          ))}
          <Button variant="outline" onClick={() => handleNumberClick(quickAmounts[0].toString())}>
            {quickAmounts[0].toLocaleString()}원
          </Button>
          
          {[4, 5, 6].map(num => (
            <Button key={num} variant="outline" onClick={() => handleNumberClick(num.toString())}>{num}</Button>
          ))}
          <Button variant="outline" onClick={() => handleNumberClick(quickAmounts[1].toString())}>
            {quickAmounts[1].toLocaleString()}원
          </Button>
          
          {[7, 8, 9].map(num => (
            <Button key={num} variant="outline" onClick={() => handleNumberClick(num.toString())}>{num}</Button>
          ))}
          <Button variant="outline" onClick={() => handleNumberClick(quickAmounts[2].toString())}>
            {quickAmounts[2].toLocaleString()}원
          </Button>
          
          <Button variant="outline" onClick={() => handleNumberClick('←')}>←</Button>
          <Button variant="outline" onClick={() => handleNumberClick('0')}>0</Button>
          <Button variant="outline" onClick={() => handleNumberClick('✓')}>✓</Button>
          <Button variant="outline" onClick={() => handleNumberClick('전액사용')}>전액사용</Button>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          취소하기
        </Button>
        <Button className="flex-1">
          사용하기
        </Button>
      </div>
    </div>
  );
}

interface CouponConfirmScreenProps {
  couponData: any;
  onBack: () => void;
}

function CouponConfirmScreen({ couponData, onBack }: CouponConfirmScreenProps) {
  const { couponInfo, subType } = couponData;
  
  const handleUseCoupon = () => {
    const couponTypeName = subType === 'basic' ? '기본 할인쿠폰' : 
                          subType === 'event' ? '이벤트 할인쿠폰' : '할인쿠폰';
    alert(`${couponTypeName}이 적용되었습니다!`);
    onBack();
  };

  const getDiscountText = () => {
    if (couponInfo.discountType === 'percentage') {
      return `${couponInfo.discountValue}% 할인`;
    } else {
      return `${couponInfo.discountValue.toLocaleString()}원 할인`;
    }
  };

  const getCouponStyle = () => {
    if (subType === 'basic') {
      return {
        gradient: 'from-blue-500 to-blue-600',
        bgColor: 'text-blue-100'
      };
    } else if (subType === 'event') {
      return {
        gradient: 'from-purple-500 to-pink-600',
        bgColor: 'text-purple-100'
      };
    } else {
      return {
        gradient: 'from-blue-500 to-purple-600',
        bgColor: 'text-blue-100'
      };
    }
  };

  const couponStyle = getCouponStyle();

  return (
    <div className="p-4 h-full flex flex-col">
      <h1 className="mb-6">🎟️ 할인쿠폰 확인</h1>
      
      {/* 쿠폰 정보 카드 */}
      <div className={`bg-gradient-to-r ${couponStyle.gradient} rounded-lg p-6 mb-6 text-white`}>
        <div className="text-center space-y-3">
          <h2 className="text-xl">{couponInfo.title}</h2>
          <div className="text-3xl font-bold">{getDiscountText()}</div>
          <p className={couponStyle.bgColor}>{couponInfo.description}</p>
        </div>
      </div>

      {/* 쿠폰 상세 정보 */}
      <div className="bg-white rounded-lg border p-4 mb-6 space-y-4">
        <div>
          <h3 className="mb-2">📋 쿠폰 정보</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">최소 주문금액:</span>
              <span>{couponInfo.minOrderAmount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">유효기간:</span>
              <span>{couponInfo.validUntil}까지</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-2">⚠️ 사용 조건</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            {couponInfo.terms.map((term: string, index: number) => (
              <li key={index}>• {term}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 할인 적용 미리보기 */}
      <div className="bg-green-50 rounded-lg border border-green-200 p-4 mb-6">
        <h3 className="text-green-800 mb-2">💰 할인 적용 예시</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>주문금액:</span>
            <span>15,000원</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>할인금액:</span>
            <span>-3,000원</span>
          </div>
          <div className="border-t border-green-200 pt-1 mt-2">
            <div className="flex justify-between font-medium text-green-800">
              <span>최종금액:</span>
              <span>12,000원</span>
            </div>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3 mt-auto">
        <Button variant="outline" onClick={onBack} className="flex-1">
          취소하기
        </Button>
        <Button onClick={handleUseCoupon} className={`flex-1 bg-gradient-to-r ${couponStyle.gradient}`}>
          쿠폰 사용하기
        </Button>
      </div>
    </div>
  );
}