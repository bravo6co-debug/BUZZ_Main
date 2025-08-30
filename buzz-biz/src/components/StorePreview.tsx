import { X, MapPin, Clock, Phone, Star } from 'lucide-react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface StorePreviewProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StorePreview({ isOpen, onClose }: StorePreviewProps) {
  // 샘플 매장 정보 데이터
  const storeInfo = {
    name: '카페 블루밍',
    category: '카페·디저트',
    rating: 4.5,
    reviewCount: 128,
    address: '서울시 강남구 테헤란로 123번길 45',
    phone: '02-1234-5678',
    hours: {
      weekday: '09:00 - 22:00',
      weekend: '10:00 - 23:00'
    },
    description: '신선한 원두와 수제 디저트를 제공하는 아늑한 카페입니다. 조용한 분위기에서 커피와 함께 여유로운 시간을 보내실 수 있습니다.',
    images: [
      'https://images.unsplash.com/photo-1708461646032-5743c250ac77?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWZlJTIwY291bnRlciUyMGNvZmZlZXxlbnwxfHx8fDE3NTY1MjM1ODV8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1705719418777-6ad45f437938?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWZlJTIwY291bnRlciUyMGNvZmZlZXxlbnwxfHx8fDE3NTY1MjM1ODV8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1708461646032-5743c250ac77?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWZlJTIwY291bnRlciUyMGNvZmZlZXxlbnwxfHx8fDE3NTY1MjM1ODV8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1705719418777-6ad45f437938?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWZlJTIwY291bnRlciUyMGNvZmZlZXxlbnwxfHx8fDE3NTY1MjM1ODV8MA&ixlib=rb-4.1.0&q=80&w=1080'
    ],
    amenities: ['Wi-Fi', '주차가능', '반려동물 동반가능', '테이크아웃']
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2>매장 정보 미리보기</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* 미리보기 내용 - 실제 사이트 스타일 시뮬레이션 */}
        <div className="p-0">
          {/* 메인 이미지 */}
          <div className="relative h-48 bg-gray-200">
            <ImageWithFallback
              src={storeInfo.images[0]}
              alt={storeInfo.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 bg-white rounded-full px-2 py-1 text-sm flex items-center gap-1">
              <Star size={14} className="text-yellow-500 fill-current" />
              {storeInfo.rating}
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* 매장명 및 카테고리 */}
            <div>
              <h1 className="text-xl mb-1">{storeInfo.name}</h1>
              <p className="text-gray-500 text-sm">{storeInfo.category}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-500 fill-current" />
                  <span className="text-sm">{storeInfo.rating}</span>
                </div>
                <span className="text-gray-400 text-sm">리뷰 {storeInfo.reviewCount}개</span>
              </div>
            </div>

            {/* 설명 */}
            <p className="text-gray-700 text-sm leading-relaxed">
              {storeInfo.description}
            </p>

            {/* 정보 섹션 */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm">{storeInfo.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock size={16} className="text-gray-500 mt-0.5" />
                <div className="text-sm">
                  <div>평일: {storeInfo.hours.weekday}</div>
                  <div>주말: {storeInfo.hours.weekend}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone size={16} className="text-gray-500" />
                <p className="text-sm">{storeInfo.phone}</p>
              </div>
            </div>

            {/* 편의시설 */}
            <div>
              <h3 className="text-sm mb-2">편의시설</h3>
              <div className="flex flex-wrap gap-2">
                {storeInfo.amenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>

            {/* 추가 이미지 */}
            <div>
              <h3 className="text-sm mb-2">매장 사진</h3>
              <div className="grid grid-cols-2 gap-2">
                {storeInfo.images.slice(0, 4).map((image, index) => (
                  <div key={index} className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                    <ImageWithFallback
                      src={image}
                      alt={`${storeInfo.name} 사진 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 액션 버튼들 (실제 사이트에서 보여질 것들 시뮬레이션) */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1">
                전화걸기
              </Button>
              <Button className="flex-1">
                예약하기
              </Button>
            </div>
          </div>
        </div>

        {/* 하단 안내 */}
        <div className="p-4 bg-gray-50 border-t">
          <p className="text-xs text-gray-500 text-center">
            위 내용은 실제 사이트에서 보여질 모습의 미리보기입니다.
          </p>
        </div>
      </div>
    </div>
  );
}