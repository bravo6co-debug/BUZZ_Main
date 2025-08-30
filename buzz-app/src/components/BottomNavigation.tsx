import { Home, MapPin, PartyPopper, User, GraduationCap } from "lucide-react";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: 'home', icon: Home, label: '홈' },
    { id: 'local', icon: MapPin, label: '지역추천' },
    { id: 'events', icon: PartyPopper, label: '이벤트' },
    { id: 'my', icon: User, label: '마이' },
    { id: 'marketer', icon: GraduationCap, label: '마케터' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
              activeTab === tab.id 
                ? 'text-blue-600' 
                : 'text-gray-500'
            }`}
          >
            <tab.icon size={20} />
            <span className="text-xs mt-1">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}