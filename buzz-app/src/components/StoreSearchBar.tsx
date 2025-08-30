import { useState, useEffect, memo } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface StoreSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  selectedTimeSlot: string;
  onTimeSlotChange: (timeSlot: string) => void;
  totalStores: number;
}

const StoreSearchBar = memo(function StoreSearchBar({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  selectedTimeSlot,
  onTimeSlotChange,
  totalStores
}: StoreSearchBarProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Debounced search - 사용자가 타이핑을 멈춘 후 300ms 뒤에 검색
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchQuery, onSearchChange]);

  const clearSearch = () => {
    setLocalSearchQuery('');
    onSearchChange('');
  };

  const resetFilters = () => {
    setLocalSearchQuery('');
    onSearchChange('');
    onCategoryChange('전체');
    onTimeSlotChange('all');
  };

  const hasActiveFilters = searchQuery || selectedCategory !== '전체' || selectedTimeSlot !== 'all';

  return (
    <div className="space-y-3">
      {/* 검색바 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        <Input
          type="text"
          placeholder="매장명으로 검색..."
          value={localSearchQuery}
          onChange={(e) => setLocalSearchQuery(e.target.value)}
          className="pl-9 pr-10"
        />
        {localSearchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={clearSearch}
          >
            <X size={14} />
          </Button>
        )}
      </div>

      {/* 카테고리 필터 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter size={16} className="text-gray-500 flex-shrink-0" />
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            className="text-xs whitespace-nowrap flex-shrink-0"
            onClick={() => onCategoryChange(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* 시간대 필터 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <span className="text-sm text-gray-500 flex-shrink-0">시간대:</span>
        <Button
          variant={selectedTimeSlot === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onTimeSlotChange('all')}
          className="text-xs px-2 py-1 flex-shrink-0"
        >
          전체
        </Button>
        <Button
          variant={selectedTimeSlot === 'morning' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onTimeSlotChange('morning')}
          className="text-xs px-2 py-1 flex-shrink-0"
        >
          아침
        </Button>
        <Button
          variant={selectedTimeSlot === 'lunch' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onTimeSlotChange('lunch')}
          className="text-xs px-2 py-1 flex-shrink-0"
        >
          점심
        </Button>
        <Button
          variant={selectedTimeSlot === 'dinner' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onTimeSlotChange('dinner')}
          className="text-xs px-2 py-1 flex-shrink-0"
        >
          저녁
        </Button>
        <Button
          variant={selectedTimeSlot === 'night' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onTimeSlotChange('night')}
          className="text-xs px-2 py-1 flex-shrink-0"
        >
          밤
        </Button>
      </div>

      {/* 활성 필터 표시 및 초기화 */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {searchQuery && (
              <Badge variant="secondary" className="text-xs">
                검색: "{searchQuery}"
              </Badge>
            )}
            {selectedCategory !== '전체' && (
              <Badge variant="secondary" className="text-xs">
                {selectedCategory}
              </Badge>
            )}
            {selectedTimeSlot !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {selectedTimeSlot === 'morning' ? '아침' :
                 selectedTimeSlot === 'lunch' ? '점심' :
                 selectedTimeSlot === 'dinner' ? '저녁' : '밤'}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-xs text-gray-500"
          >
            필터 초기화
          </Button>
        </div>
      )}

      {/* 결과 요약 */}
      <div className="text-xs text-gray-500">
        {hasActiveFilters ? (
          `필터링된 결과`
        ) : (
          totalStores > 0 && `전체 ${totalStores}개 매장`
        )}
      </div>
    </div>
  );
});

export default StoreSearchBar;