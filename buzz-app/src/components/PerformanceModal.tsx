import { X, TrendingUp, Users, Eye, DollarSign, Calendar } from "lucide-react";
import { Button } from "./ui/button";

interface PerformanceModalProps {
  data: {
    visitors: number;
    signups: number;
    revenue: number;
    conversionRate: number;
    rank: number;
  };
  onClose: () => void;
}

export default function PerformanceModal({ data, onClose }: PerformanceModalProps) {
  const chartData = [
    { date: "1/1", visitors: 20, signups: 8 },
    { date: "1/2", visitors: 35, signups: 12 },
    { date: "1/3", visitors: 28, signups: 9 },
    { date: "1/4", visitors: 45, signups: 18 },
    { date: "1/5", visitors: 52, signups: 21 },
    { date: "1/6", visitors: 38, signups: 14 },
    { date: "1/7", visitors: 42, signups: 16 },
  ];

  const maxVisitors = Math.max(...chartData.map(d => d.visitors));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} />
            <h3>📊 성과 상세보기</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="p-4 space-y-6 max-h-96 overflow-y-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Eye size={16} className="text-blue-600" />
                <span className="text-sm text-blue-700">총 방문자</span>
              </div>
              <div className="text-xl font-bold text-blue-800">{data.visitors}</div>
              <div className="text-xs text-blue-600">+12% (전주 대비)</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-green-600" />
                <span className="text-sm text-green-700">신규 가입</span>
              </div>
              <div className="text-xl font-bold text-green-800">{data.signups}</div>
              <div className="text-xs text-green-600">+8% (전주 대비)</div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-purple-600" />
                <span className="text-sm text-purple-700">수익</span>
              </div>
              <div className="text-lg font-bold text-purple-800">{data.revenue.toLocaleString()}원</div>
              <div className="text-xs text-purple-600">+15% (전주 대비)</div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-orange-600" />
                <span className="text-sm text-orange-700">전환율</span>
              </div>
              <div className="text-xl font-bold text-orange-800">{data.conversionRate}%</div>
              <div className="text-xs text-orange-600">+2.1% (전주 대비)</div>
            </div>
          </div>

          {/* Chart */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Calendar size={16} />
              주간 성과
            </h4>
            <div className="space-y-2">
              {chartData.map((day, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-8 text-xs text-gray-600">{day.date}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div 
                        className="bg-blue-200 h-2 rounded-full"
                        style={{ width: `${(day.visitors / maxVisitors) * 100}%` }}
                      ></div>
                      <span className="text-xs text-gray-600">{day.visitors}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="bg-green-200 h-2 rounded-full"
                        style={{ width: `${(day.signups / maxVisitors) * 100}%` }}
                      ></div>
                      <span className="text-xs text-gray-600">{day.signups}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 bg-blue-200 rounded"></div>
                <span>방문자</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 bg-green-200 rounded"></div>
                <span>가입자</span>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="text-yellow-600">💡</span>
              <div>
                <h5 className="font-medium text-yellow-800 text-sm">성과 개선 제안</h5>
                <p className="text-xs text-yellow-700 mt-1">
                  오후 2-6시 사이에 가장 높은 전환율을 보입니다. 이 시간대에 SNS 활동을 늘려보세요!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}