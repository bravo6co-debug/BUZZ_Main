import { useState } from "react";
import { Gift, Users, Clock, X, Calendar, Award } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

export default function EventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const ongoingEvents = [
    {
      id: 1,
      title: "신규가입 대박 이벤트!",
      description: "가입하고 10,000원 혜택 받기",
      daysLeft: 7,
      type: "신규가입",
      bgColor: "from-red-50 to-pink-50",
      textColor: "text-red-600"
    },
    {
      id: 2,
      title: "첫 리뷰 작성 이벤트",
      description: "첫 리뷰 작성시 5,000P 지급",
      daysLeft: 14,
      type: "리뷰",
      bgColor: "from-blue-50 to-indigo-50",
      textColor: "text-blue-600"
    },
    {
      id: 3,
      title: "주말 특가 쿠폰팩",
      description: "주말 한정 특가 쿠폰 모음",
      daysLeft: 3,
      type: "쿠폰",
      bgColor: "from-green-50 to-emerald-50",
      textColor: "text-green-600"
    }
  ];

  const referralChallenges = [
    {
      id: 1,
      title: "친구 추천 챌린지",
      description: "친구 5명 추천시 추가 5,000P!",
      currentCount: 2,
      targetCount: 5,
      reward: "5,000P"
    },
    {
      id: 2,
      title: "연속 체크인 챌린지",
      description: "7일 연속 체크인시 특별 혜택",
      currentCount: 4,
      targetCount: 7,
      reward: "특별쿠폰"
    }
  ];

  return (
    <div className="p-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2">
          🎪 이벤트
        </h1>
      </div>

      {/* Ongoing Events */}
      <div className="mb-8">
        <h2 className="flex items-center gap-2 mb-4">
          🔥 진행 중인 이벤트
        </h2>
        <div className="space-y-4">
          {ongoingEvents.map((event) => (
            <div key={event.id} className={`bg-gradient-to-r ${event.bgColor} rounded-lg p-4 border`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={event.textColor}>
                      {event.type}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock size={14} />
                      <span>D-{event.daysLeft}</span>
                    </div>
                  </div>
                  <h3 className="font-medium mb-1">🎉 {event.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{event.description}</p>
                  <Button 
                    size="sm" 
                    className={event.textColor}
                    onClick={() => setSelectedEvent(event)}
                  >
                    자세히 보기
                  </Button>
                </div>
                <div className="w-16 h-16 bg-white bg-opacity-50 rounded-md ml-3 flex items-center justify-center">
                  <Gift size={24} className={event.textColor} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Referral Challenges */}
      <div className="mb-6">
        <h2 className="flex items-center gap-2 mb-4">
          💰 리퍼럴 챌린지
        </h2>
        <div className="space-y-4">
          {referralChallenges.map((challenge) => (
            <div key={challenge.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium mb-1">{challenge.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{challenge.description}</p>
                  
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>진행상황</span>
                      <span>{challenge.currentCount}/{challenge.targetCount}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(challenge.currentCount / challenge.targetCount) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-gray-500">보상: </span>
                      <span className="font-medium text-blue-600">{challenge.reward}</span>
                    </div>
                    <Button size="sm">
                      <Users size={14} className="mr-1" />
                      참여하기
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Special Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-yellow-600 text-xl">💡</span>
          <div>
            <h3 className="font-medium text-yellow-800 mb-1">이벤트 참여 팁!</h3>
            <p className="text-sm text-yellow-700">
              이벤트는 중복 참여 가능하며, 리퍼럴 링크를 통한 가입자가 많을수록 더 많은 혜택을 받을 수 있어요.
            </p>
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                🎪 이벤트 상세
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Event Header */}
              <div className={`bg-gradient-to-r ${selectedEvent.bgColor} rounded-lg p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={selectedEvent.textColor}>
                    {selectedEvent.type}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock size={14} />
                    <span>D-{selectedEvent.daysLeft}</span>
                  </div>
                </div>
                <h3 className="font-medium text-lg">{selectedEvent.title}</h3>
                <p className="text-gray-600 mt-1">{selectedEvent.description}</p>
              </div>

              {/* Event Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar size={20} className="text-blue-600" />
                  <div>
                    <div className="font-medium">이벤트 기간</div>
                    <div className="text-sm text-gray-600">2024.01.01 ~ 2024.01.31</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Award size={20} className="text-green-600" />
                  <div>
                    <div className="font-medium">참여 혜택</div>
                    <div className="text-sm text-gray-600">
                      {selectedEvent.type === '신규가입' && '10,000원 상당의 쿠폰 팩'}
                      {selectedEvent.type === '리뷰' && '5,000P 즉시 지급'}
                      {selectedEvent.type === '쿠폰' && '최대 50% 할인 쿠폰'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Users size={20} className="text-purple-600" />
                  <div>
                    <div className="font-medium">참여 조건</div>
                    <div className="text-sm text-gray-600">
                      {selectedEvent.type === '신규가입' && '첫 가입 후 인증 완료'}
                      {selectedEvent.type === '리뷰' && '매장 방문 후 리뷰 작성'}
                      {selectedEvent.type === '쿠폰' && '주말 기간 내 사용'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedEvent(null)}>
                  닫기
                </Button>
                <Button className="flex-1">
                  🎉 지금 참여하기
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}