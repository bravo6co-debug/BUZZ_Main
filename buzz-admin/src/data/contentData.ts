// Content Management Mock Data
export const regionRecommendations = [
  { id: 1, region: '강남구', title: '강남 핫플레이스 맛집', content: '트렌디한 강남의 숨은 맛집들을 소개합니다', status: 'active', views: 15420, lastUpdate: '2025-01-20' },
  { id: 2, region: '홍대', title: '홍대 청춘 맛집', content: '젊음이 넘치는 홍대의 인기 맛집 코스', status: 'active', views: 12380, lastUpdate: '2025-01-18' },
  { id: 3, region: '명동', title: '명동 관광 맛집', content: '외국인 관광객도 사랑하는 명동 맛집', status: 'draft', views: 0, lastUpdate: '2025-01-15' },
]

export const events = [
  { id: 1, title: '신년 특별 할인 이벤트', description: '새해를 맞아 전 매장 특별 할인', startDate: '2025-01-01', endDate: '2025-01-31', status: 'active', participants: 2847 },
  { id: 2, title: '리뷰 작성 이벤트', description: '리뷰 작성 시 적립금 지급', startDate: '2025-01-15', endDate: '2025-02-15', status: 'active', participants: 1592 },
  { id: 3, title: '친구 추천 이벤트', description: '친구 추천 시 양쪽 모두 혜택', startDate: '2025-02-01', endDate: '2025-02-28', status: 'scheduled', participants: 0 },
]

export const homeScreenContents = [
  { id: 1, type: 'banner', title: '메인 배너', content: '신년 특별 이벤트 배너', order: 1, status: 'active' },
  { id: 2, type: 'recommendation', title: '오늘의 추천', content: '강남구 인기 맛집 3곳', order: 2, status: 'active' },
  { id: 3, type: 'category', title: '카테고리 섹션', content: '한식, 중식, 일식, 양식', order: 3, status: 'active' },
  { id: 4, type: 'promotion', title: '프로모션', content: '할인 매장 모음', order: 4, status: 'active' },
]

export const marketerContents = [
  { id: 1, title: '1월 맛집 트렌드 분석', author: '마케팅팀', content: '2025년 1월 맛집 트렌드와 인사이트', publishDate: '2025-01-20', status: 'published', views: 3420 },
  { id: 2, title: '지역별 매출 분석 리포트', author: '데이터팀', content: '12월 지역별 매출 현황과 분석', publishDate: '2025-01-18', status: 'published', views: 2180 },
  { id: 3, title: '신규 매장 온보딩 가이드', author: '운영팀', content: '신규 매장 등록 및 운영 가이드', publishDate: '2025-01-15', status: 'draft', views: 0 },
]