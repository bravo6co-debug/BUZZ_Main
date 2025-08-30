import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { BusinessWithTimeSlots } from '../services/timeBasedDisplay.service';

interface InfiniteStoreListProps {
  initialStores: BusinessWithTimeSlots[];
  loadMore: (offset: number) => Promise<{ stores: BusinessWithTimeSlots[]; hasMore: boolean; total: number }>;
  onStoreSelect: (store: BusinessWithTimeSlots) => void;
  onReviewClick: (store: BusinessWithTimeSlots) => void;
  searchQuery?: string;
  selectedCategory?: string;
  selectedTimeSlot?: string;
}

const StoreCardSkeleton = () => (
  <div className="bg-white rounded-lg border p-3 animate-pulse">
    <div className="w-full h-20 bg-gray-200 rounded-md mb-2"></div>
    <div className="h-4 bg-gray-200 rounded mb-1"></div>
    <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
    <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
    <div className="h-7 bg-gray-200 rounded"></div>
  </div>
);

const InfiniteStoreList = memo(function InfiniteStoreList({
  initialStores,
  loadMore,
  onStoreSelect,
  onReviewClick,
  searchQuery = '',
  selectedCategory = '전체',
  selectedTimeSlot = null
}: InfiniteStoreListProps) {
  const [stores, setStores] = useState<BusinessWithTimeSlots[]>(initialStores);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const observerRef = useRef<IntersectionObserver>();
  const lastStoreElementRef = useRef<HTMLDivElement>(null);

  // 필터가 변경될 때마다 스토어 목록 리셋
  useEffect(() => {
    setStores(initialStores);
    setHasMore(true);
    setTotal(0);
    setError(null);
  }, [initialStores, searchQuery, selectedCategory, selectedTimeSlot]);

  // 무한 스크롤을 위한 Intersection Observer
  const lastStoreElementRefCallback = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadMoreStores();
      }
    }, {
      threshold: 0.1,
      rootMargin: '100px' // 100px 전에 미리 로드
    });
    
    if (node) observerRef.current.observe(node);
    lastStoreElementRef.current = node;
  }, [loading, hasMore]);

  const loadMoreStores = async () => {
    if (loading || !hasMore) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await loadMore(stores.length);
      
      if (result.stores.length > 0) {
        setStores(prevStores => [...prevStores, ...result.stores]);
        setHasMore(result.hasMore);
        setTotal(result.total);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more stores:', error);
      setError('매장을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 검색어나 필터에 따른 클라이언트 사이드 필터링
  const filteredStores = stores.filter(store => {
    // 검색어 필터링
    if (searchQuery && !store.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // 카테고리 필터링
    if (selectedCategory !== '전체' && store.category !== selectedCategory) {
      return false;
    }
    
    return true;
  });

  if (filteredStores.length === 0 && !loading && !error) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">🏪</div>
        <h3 className="text-lg font-medium mb-2">매장을 찾을 수 없습니다</h3>
        <p className="text-gray-500 mb-4">
          {searchQuery 
            ? `"${searchQuery}"에 대한 검색 결과가 없습니다`
            : '조건에 맞는 매장이 없습니다'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 매장 개수 표시 */}
      {(total > 0 || filteredStores.length > 0) && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {searchQuery || selectedCategory !== '전체' 
              ? `${filteredStores.length}개 매장`
              : total > 0 
                ? `전체 ${total}개 매장 중 ${stores.length}개 표시`
                : `${stores.length}개 매장`
            }
          </p>
        </div>
      )}

      {/* 매장 그리드 */}
      <div className="grid grid-cols-3 gap-3">
        {filteredStores.map((store, index) => (
          <div 
            key={store.id}
            ref={index === filteredStores.length - 1 ? lastStoreElementRefCallback : null}
            className="bg-white rounded-lg border p-3 hover:shadow-md transition-shadow"
          >
            <div 
              className="cursor-pointer"
              onClick={() => onStoreSelect(store)}
            >
              <div className="w-full h-20 bg-gray-200 rounded-md mb-2 flex items-center justify-center overflow-hidden">
                {store.image_url ? (
                  <img 
                    src={store.image_url} 
                    alt={store.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xs text-gray-500">매장 이미지</span>
                )}
              </div>
              <div className="text-sm font-medium mb-1 truncate" title={store.name}>
                {store.name}
              </div>
              <div className="flex items-center gap-1 mb-2">
                <Star size={12} className="text-yellow-500 fill-current" />
                <span className="text-xs">{store.rating || 4.0}</span>
              </div>
              <Badge variant="secondary" className="text-xs mb-2">
                🎫 {store.coupon || '할인'}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onReviewClick(store);
              }}
            >
              <MessageSquare size={12} className="mr-1" />
              리뷰쓰기
            </Button>
          </div>
        ))}
        
        {/* 로딩 스켈레톤 */}
        {loading && (
          <>
            {[...Array(6)].map((_, index) => (
              <StoreCardSkeleton key={`skeleton-${index}`} />
            ))}
          </>
        )}
      </div>

      {/* 로딩 인디케이터 */}
      {loading && stores.length > 0 && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            더 많은 매장을 불러오는 중...
          </div>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="text-center py-4">
          <p className="text-red-500 text-sm mb-2">{error}</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => loadMoreStores()}
          >
            다시 시도
          </Button>
        </div>
      )}

      {/* 더 이상 로드할 매장이 없을 때 */}
      {!hasMore && stores.length > 0 && !loading && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">모든 매장을 확인했습니다 ✨</p>
        </div>
      )}

      {/* 빈 상태 (초기 로드 실패) */}
      {filteredStores.length === 0 && error && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">😕</div>
          <h3 className="text-lg font-medium mb-2">매장을 불러올 수 없습니다</h3>
          <p className="text-gray-500 mb-4">잠시 후 다시 시도해주세요</p>
          <Button onClick={() => window.location.reload()}>
            새로고침
          </Button>
        </div>
      )}
    </div>
  );
});

export default InfiniteStoreList;