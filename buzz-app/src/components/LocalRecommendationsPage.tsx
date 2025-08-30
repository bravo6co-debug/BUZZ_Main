import { useState } from "react";
import { Star, Share, Facebook, Twitter, Instagram, Link } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { toast } from "sonner@2.0.3";

export default function LocalRecommendationsPage() {
  const popularSpots = [
    { id: 1, name: "이기대 해안산책로", rating: 5, description: "#포토스팟 #일몰명소" },
    { id: 2, name: "용호만 카페거리", rating: 4, description: "#카페투어 #바다뷰" },
    { id: 3, name: "부산현대미술관", rating: 5, description: "#문화체험 #전시" },
    { id: 4, name: "감천문화마을", rating: 4, description: "#컬러풀 #인스타" },
    { id: 5, name: "태종대", rating: 5, description: "#자연경관 #등대" },
  ];

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star 
        key={i} 
        size={14} 
        className={i < rating ? "text-yellow-500 fill-current" : "text-gray-300"} 
      />
    ));
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = "부산 지역 추천 명소를 확인해보세요! 🗺️";
    
    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'instagram':
        navigator.clipboard.writeText(`${text} ${url}`);
        toast.success("링크가 복사되었습니다! 인스타그램에 붙여넣기 하세요.");
        break;
      case 'link':
        navigator.clipboard.writeText(url);
        toast.success("링크가 복사되었습니다!");
        break;
    }
  };

  return (
    <div className="p-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2 mb-4">
          🗺️ 지역추천
        </h1>
      </div>

      {/* This Week's Recommendation */}
      <div className="mb-6">
        <h2 className="flex items-center gap-2 mb-4">
          🌟 이번 주 추천
        </h2>
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border">
          <div className="w-full h-40 bg-gray-200 rounded-md mb-3 flex items-center justify-center">
            <span className="text-gray-500">대표 이미지</span>
          </div>
          <h3 className="font-medium mb-2">"남구 해안 산책로"</h3>
          <div className="flex gap-2 mb-3">
            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              #포토스팟
            </span>
            <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              #일몰명소
            </span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            부산의 아름다운 해안선을 따라 걸으며 일몰을 감상할 수 있는 최고의 산책로입니다. 
            특히 저녁 시간대에 방문하시면 환상적인 노을을 만나실 수 있어요.
          </p>
        </div>
      </div>

      {/* Popular Spots */}
      <div className="mb-6">
        <h2 className="flex items-center gap-2 mb-4">
          📍 인기 명소
        </h2>
        <div className="space-y-3">
          {popularSpots.map((spot) => (
            <div key={spot.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium mb-1">{spot.name}</h3>
                  <div className="flex items-center gap-1 mb-2">
                    {renderStars(spot.rating)}
                  </div>
                  <p className="text-sm text-gray-600">{spot.description}</p>
                </div>
                <div className="w-16 h-16 bg-gray-200 rounded-md ml-3 flex-shrink-0 flex items-center justify-center">
                  <span className="text-xs text-gray-500">이미지</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Share Button */}
      <div className="text-center">
        <Sheet>
          <SheetTrigger asChild>
            <Button className="w-full" size="lg">
              <Share size={16} className="mr-2" />
              SNS 공유하기
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader className="mb-6">
              <SheetTitle>지역추천 공유하기</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-20"
                onClick={() => handleShare('facebook')}
              >
                <Facebook size={24} className="text-blue-600" />
                <span className="text-xs">페이스북</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-20"
                onClick={() => handleShare('twitter')}
              >
                <Twitter size={24} className="text-blue-400" />
                <span className="text-xs">트위터</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-20"
                onClick={() => handleShare('instagram')}
              >
                <Instagram size={24} className="text-pink-600" />
                <span className="text-xs">인스타그램</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-20"
                onClick={() => handleShare('link')}
              >
                <Link size={24} className="text-gray-600" />
                <span className="text-xs">링크복사</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}