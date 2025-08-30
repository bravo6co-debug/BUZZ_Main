import { useState, useRef, useEffect } from 'react';
import { X, Camera, Zap, ZapOff } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
      setIsScanning(true);
      
      // Simulate QR code detection
      simulateQRDetection();
    } catch (err) {
      console.error('Camera error:', err);
      setError('카메라 접근 권한이 필요합니다');
      setHasPermission(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const simulateQRDetection = () => {
    // In production, use a real QR code scanning library like qr-scanner or zxing-js
    setTimeout(() => {
      if (isScanning) {
        const mockQRData = `BUZZ_COUPON_${Date.now()}`;
        handleScan(mockQRData);
      }
    }, 3000);
  };

  const handleScan = (data: string) => {
    setIsScanning(false);
    stopCamera();
    toast.success('QR 코드 스캔 완료!');
    onScan(data);
  };

  const toggleFlash = async () => {
    try {
      const track = streamRef.current?.getVideoTracks()[0];
      if (track && 'torch' in track.getCapabilities()) {
        await track.applyConstraints({
          advanced: [{ torch: !flashEnabled }]
        });
        setFlashEnabled(!flashEnabled);
      } else {
        toast.error('플래시를 지원하지 않는 기기입니다');
      }
    } catch (err) {
      console.error('Flash toggle error:', err);
      toast.error('플래시 전환 실패');
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
        <div className="text-white text-center">
          <Camera size={48} className="mx-auto mb-4 opacity-50" />
          <h2 className="text-xl mb-2">카메라 접근 실패</h2>
          <p className="mb-4">{error}</p>
          <Button onClick={onClose} variant="secondary">
            닫기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10">
        <div className="flex justify-between items-center">
          <h2 className="text-white text-lg font-medium">QR 코드 스캔</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X size={24} />
          </Button>
        </div>
      </div>

      {/* Camera View */}
      <div className="relative h-full flex items-center justify-center">
        {hasPermission ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Scanning Frame */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="w-64 h-64 border-2 border-white rounded-lg">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                </div>
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-red-500 animate-pulse"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-32 left-0 right-0 text-center">
              <p className="text-white text-sm bg-black/50 inline-block px-4 py-2 rounded-full">
                QR 코드를 프레임 안에 맞춰주세요
              </p>
            </div>
          </>
        ) : (
          <div className="text-white text-center">
            <Camera size={48} className="mx-auto mb-4 animate-pulse" />
            <p>카메라 준비 중...</p>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
        <div className="flex justify-center gap-4">
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleFlash}
            disabled={!hasPermission}
            className="w-12 h-12"
          >
            {flashEnabled ? <Zap size={20} /> : <ZapOff size={20} />}
          </Button>
        </div>
      </div>
    </div>
  );
}