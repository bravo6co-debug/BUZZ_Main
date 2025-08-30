import React, { useState, useRef, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Camera, Gift, Coins, Check, RotateCcw, X, Loader2, Zap, ZapOff, AlertCircle } from 'lucide-react';
import { qrApi } from '../services/api.service';
import { realtimeQRService } from '../services/realtime-qr.service';
import { businessService } from '../services/business.service';
import { toast } from 'sonner';
import QrScanner from 'qr-scanner';

type ScanMode = 'coupon' | 'mileage';
type ScanStep = 'scanning' | 'confirmation' | 'completed';

interface CouponData {
  customer: string;
  type: string;
  discount: number;
  expiry: string;
}

interface MileageData {
  customer: string;
  points: number;
  balance: number;
}

export function QRScanScreen() {
  const [scanMode, setScanMode] = useState<ScanMode>('coupon');
  const [scanStep, setScanStep] = useState<ScanStep>('scanning');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  
  const [couponData, setCouponData] = useState<CouponData>({
    customer: '김○○님',
    type: '가입 축하 쿠폰',
    discount: 5000,
    expiry: '2024.12.31'
  });
  const [mileageData, setMileageData] = useState<MileageData>({
    customer: '이○○님',
    points: 500,
    balance: 2500
  });

  // 비즈니스 정보 및 실시간 구독 초기화
  useEffect(() => {
    initializeBusiness();
  }, []);

  // QR 스캐너 초기화
  useEffect(() => {
    if (scanStep === 'scanning' && videoRef.current) {
      startQRScanner();
    }
    
    return () => {
      stopQRScanner();
    };
  }, [scanStep]);

  const initializeBusiness = async () => {
    const business = await businessService.getCurrentBusiness();
    if (business) {
      setBusinessId(business.id);
      // 실시간 QR 스캔 이벤트 구독
      realtimeQRService.subscribeToQRScans(business.id, (event) => {
        console.log('QR Scan Event:', event);
        if (event.status === 'completed') {
          toast.success('QR 처리 완료!');
        } else if (event.status === 'failed') {
          toast.error('QR 처리 실패');
        }
      });
    }
  };

  const startQRScanner = async () => {
    if (!videoRef.current) return;
    
    try {
      setError(null);
      setIsScanning(true);
      
      // QR Scanner 인스턴스 생성
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => handleQRDetected(result.data),
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
        }
      );
      
      await qrScannerRef.current.start();
    } catch (err) {
      console.error('QR Scanner start error:', err);
      setError('카메라 접근 권한이 필요합니다. 브라우저 설정에서 카메라 권한을 허용해주세요.');
      setIsScanning(false);
    }
  };

  const stopQRScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleQRDetected = async (qrData: string) => {
    if (!isScanning) return;
    
    setScannedData(qrData);
    setIsScanning(false);
    stopQRScanner();
    
    // QR 데이터 검증
    if (validateQRData(qrData)) {
      await processQRData(qrData);
    } else {
      setError('유효하지 않은 QR 코드입니다. BUZZ 앱에서 생성된 QR 코드만 사용 가능합니다.');
      setTimeout(() => {
        setError(null);
        startQRScanner();
      }, 3000);
    }
  };

  const validateQRData = (qrData: string): boolean => {
    // BUZZ QR 코드 형식 검증: BUZZ_COUPON_timestamp 또는 BUZZ_MILEAGE_timestamp
    const couponPattern = /^BUZZ_COUPON_\d+$/;
    const mileagePattern = /^BUZZ_MILEAGE_\d+$/;
    
    if (scanMode === 'coupon') {
      return couponPattern.test(qrData);
    } else {
      return mileagePattern.test(qrData);
    }
  };

  const processQRData = async (qrData: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // QR 데이터 파싱
      const [prefix, type, dataStr] = qrData.split('_');
      
      if (!businessId) {
        throw new Error('비즈니스 정보를 불러올 수 없습니다');
      }

      // 실시간 QR 스캔 레코드 생성
      const scanRecord = await realtimeQRService.createScanRecord(
        businessId,
        'test-customer-id', // 실제로는 QR 데이터에서 추출
        scanMode,
        { qrData, timestamp: Date.now() }
      );

      if (scanRecord) {
        setScanStep('confirmation');
        toast.info('QR 코드를 확인하는 중...');
        
        // Mock 데이터로 UI 업데이트
        if (scanMode === 'coupon') {
          setCouponData({
            customer: '김○○님',
            type: '신규 가입 쿠폰',
            discount: 5000,
            expiry: '2024.12.31'
          });
        } else {
          setMileageData({
            customer: '이○○님',
            points: 500,
            balance: 2500
          });
        }
      } else {
        throw new Error('QR 처리 실패');
      }
    } catch (err: any) {
      console.error('QR process error:', err);
      setError(err.message || 'QR 코드 처리 중 오류가 발생했습니다.');
      setTimeout(() => {
        setError(null);
        startQRScanner();
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlash = async () => {
    if (!qrScannerRef.current) return;
    
    try {
      if (flashEnabled) {
        await qrScannerRef.current.turnFlashOff();
        setFlashEnabled(false);
      } else {
        await qrScannerRef.current.turnFlashOn();
        setFlashEnabled(true);
      }
    } catch (err) {
      console.error('Flash toggle error:', err);
      setError('플래시 기능이 지원되지 않는 기기입니다.');
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!scannedData || !businessId) {
        throw new Error('QR 데이터가 없습니다');
      }

      // 실시간으로 처리 상태 업데이트
      if (scanMode === 'coupon') {
        toast.success(`${couponData.discount}원 쿠폰이 사용되었습니다`);
      } else {
        toast.success(`${mileageData.points}P가 적립되었습니다`);
      }
      
      setScanStep('completed');
      
      // 3초 후 자동으로 스캔 화면으로 복귀
      setTimeout(() => {
        handleReset();
      }, 3000);
    } catch (err: any) {
      console.error('QR confirm error:', err);
      toast.error(err.message || '처리 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setError(null);
    setScannedData(null);
    setScanStep('scanning');
  };

  const renderScanningView = () => (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">📸 QR 코드 스캔</h2>
        
        {/* Mode Toggle Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
          <Button
            variant={scanMode === 'coupon' ? 'default' : 'ghost'}
            className="h-12 text-sm font-medium"
            onClick={() => setScanMode('coupon')}
          >
            <Gift className="w-4 h-4 mr-2" />
            🎫 할인 쿠폰
          </Button>
          <Button
            variant={scanMode === 'mileage' ? 'default' : 'ghost'}
            className="h-12 text-sm font-medium"
            onClick={() => setScanMode('mileage')}
          >
            <Coins className="w-4 h-4 mr-2" />
            💰 마일리지
          </Button>
        </div>
      </div>

      {/* Camera Viewfinder */}
      <Card className="p-0 overflow-hidden">
        <div className="aspect-square relative bg-black rounded-lg">
          <video
            ref={videoRef}
            className="w-full h-full object-cover rounded-lg"
            playsInline
            muted
          />
          
          {!isScanning && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-4 bg-black/50">
              <Camera className="w-16 h-16" />
              <div className="text-center space-y-2">
                <p className="font-medium">
                  {scanMode === 'coupon' ? '할인 쿠폰 QR 코드를' : '마일리지 QR 코드를'}
                </p>
                <p className="font-medium">화면에 맞춰 주세요</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-4 bg-red-900/80">
              <X className="w-16 h-16" />
              <p className="text-center text-sm px-4">{error}</p>
            </div>
          )}
          
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-white rounded-lg">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
              </div>
            </div>
          )}
          
          {/* Flash Button */}
          {isScanning && (
            <div className="absolute top-4 right-4">
              <Button
                variant="secondary"
                size="icon"
                onClick={toggleFlash}
                className="w-10 h-10 bg-black/50 hover:bg-black/70 border-white/50"
              >
                {flashEnabled ? 
                  <Zap size={16} className="text-white" /> : 
                  <ZapOff size={16} className="text-white" />
                }
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Status and Instructions */}
      <div className="text-center space-y-2">
        {isScanning ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-sm font-medium text-green-600">스캔 중... QR 코드를 카메라에 비춰주세요</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p className="text-sm font-medium">처리 중...</p>
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {scanMode === 'coupon' ? '쿠폰 QR 스캔 준비' : '마일리지 QR 스캔 준비'}
          </p>
        )}
      </div>
    </div>
  );

  const renderConfirmationView = () => (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-2">
        <Check className="w-6 h-6 text-green-600" />
        <h2 className="text-xl font-semibold">
          {scanMode === 'coupon' ? '할인 쿠폰 확인' : '마일리지 사용 확인'}
        </h2>
      </div>

      {/* Scanned QR Info */}
      {scannedData && (
        <Card className="p-3 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">QR 코드 스캔 완료</span>
          </div>
          <p className="text-xs text-green-600 font-mono break-all">{scannedData}</p>
        </Card>
      )}

      {scanMode === 'coupon' ? (
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">🎫 쿠폰 정보</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">고객:</span>
              <span className="font-medium">{couponData.customer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">쿠폰 종류:</span>
              <span className="font-medium">{couponData.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">할인 혜택:</span>
              <span className="font-semibold text-primary">{couponData.discount.toLocaleString()}원 할인</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">유효기간:</span>
              <span className="font-medium">{couponData.expiry}까지</span>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">💰 할인 적용</h4>
            <p className="text-sm text-muted-foreground">
              결제 금액에서 {couponData.discount.toLocaleString()}원을 할인해 드립니다
            </p>
          </div>
        </Card>
      ) : (
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Coins className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">💰 마일리지 정보</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">고객:</span>
              <span className="font-medium">{mileageData.customer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">사용 포인트:</span>
              <span className="font-semibold text-primary">{mileageData.points.toLocaleString()}P</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">잔여 포인트:</span>
              <span className="font-medium">{mileageData.balance.toLocaleString()}P</span>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">💳 포인트 사용</h4>
            <p className="text-sm text-muted-foreground">
              {mileageData.points.toLocaleString()}P를 사용하여 할인을 적용합니다
            </p>
          </div>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={handleReset} className="flex-1">
          <X className="w-4 h-4 mr-2" />
          취소
        </Button>
        <Button onClick={handleConfirm} className="flex-1">
          <Check className="w-4 h-4 mr-2" />
          {scanMode === 'coupon' ? '쿠폰 사용하기' : '포인트 사용하기'}
        </Button>
      </div>
    </div>
  );

  const renderCompletedView = () => (
    <div className="p-4 space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold">
          ✅ {scanMode === 'coupon' ? '쿠폰 사용 완료!' : '포인트 사용 완료!'}
        </h2>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">
          🎉 {scanMode === 'coupon' ? '할인이 적용되었습니다' : '포인트가 사용되었습니다'}
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {scanMode === 'coupon' ? '할인 금액:' : '사용 포인트:'}
            </span>
            <span className="font-semibold text-primary">
              {scanMode === 'coupon' 
                ? `${couponData.discount.toLocaleString()}원` 
                : `${mileageData.points.toLocaleString()}P`
              }
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">처리 시간:</span>
            <span className="font-medium">14:23</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">고객:</span>
            <span className="font-medium">
              {scanMode === 'coupon' ? couponData.customer : mileageData.customer}
            </span>
          </div>
        </div>
      </Card>

      <Button onClick={handleReset} className="w-full h-12">
        <RotateCcw className="w-4 h-4 mr-2" />
        🔄 새 QR 스캔하기
      </Button>
    </div>
  );

  switch (scanStep) {
    case 'scanning':
      return renderScanningView();
    case 'confirmation':
      return renderConfirmationView();
    case 'completed':
      return renderCompletedView();
    default:
      return renderScanningView();
  }
}