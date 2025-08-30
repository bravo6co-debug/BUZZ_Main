// Store Management Mock Data
export const pendingStores = [
  { id: 1, name: '강남 맛집', owner: '김영희', location: '서울 강남구', category: '한식', submitDate: '2025-01-20', docs: ['사업자등록증', '통장사본'], status: 'pending' },
  { id: 2, name: '홍대 카페', owner: '이철수', location: '서울 마포구', category: '카페', submitDate: '2025-01-19', docs: ['사업자등록증', '임대차계약서'], status: 'pending' },
  { id: 3, name: '부산 해물집', owner: '박민수', location: '부산 해운대구', category: '해산물', submitDate: '2025-01-18', docs: ['사업자등록증'], status: 'reviewing' },
]

export const activeStores = [
  { id: 1, name: '서울 닭갈비', owner: '정수연', location: '서울 종로구', category: '한식', joinDate: '2024-12-15', rating: 4.8, reviews: 156, revenue: 2340000, status: 'active', exposureRank: 3 },
  { id: 2, name: '명동 떡볶이', owner: '최민지', location: '서울 중구', category: '분식', joinDate: '2024-11-20', rating: 4.6, reviews: 234, revenue: 1890000, status: 'active', exposureRank: 1 },
  { id: 3, name: '이태원 피자', owner: '한동현', location: '서울 용산구', category: '양식', joinDate: '2024-10-05', rating: 4.9, reviews: 89, revenue: 3120000, status: 'active', exposureRank: 2 },
  { id: 4, name: '청담 스시', owner: '윤서아', location: '서울 강남구', category: '일식', joinDate: '2024-09-12', rating: 4.7, reviews: 67, revenue: 4560000, status: 'suspended', exposureRank: null },
]

export const exposureMetrics = [
  { region: '강남구', totalStores: 45, activeRotation: 12, avgExposureTime: 2.4, lastUpdate: '10분 전' },
  { region: '마포구', totalStores: 38, activeRotation: 10, avgExposureTime: 2.8, lastUpdate: '15분 전' },
  { region: '종로구', totalStores: 42, activeRotation: 11, avgExposureTime: 2.1, lastUpdate: '5분 전' },
  { region: '해운대구', totalStores: 28, activeRotation: 8, avgExposureTime: 3.2, lastUpdate: '20분 전' },
]

// Settlement Management Mock Data
export const settlementRequests = [
  { id: 1, storeName: '강남 맛집', owner: '김영희', amount: 2340000, period: '2025-01', requestDate: '2025-01-25', status: 'pending', documents: 3 },
  { id: 2, storeName: '홍대 카페', owner: '이철수', amount: 1890000, period: '2025-01', requestDate: '2025-01-24', status: 'reviewing', documents: 2 },
  { id: 3, storeName: '부산 해물집', owner: '박민수', amount: 3120000, period: '2025-01', requestDate: '2025-01-23', status: 'pending', documents: 4 },
]

export const settlementHistory = [
  { id: 1, storeName: '서울 닭갈비', owner: '정수연', amount: 2180000, period: '2024-12', processDate: '2025-01-05', status: 'approved', approver: '관리자1' },
  { id: 2, storeName: '명동 떡볶이', owner: '최민지', amount: 1650000, period: '2024-12', processDate: '2025-01-04', status: 'approved', approver: '관리자2' },
  { id: 3, storeName: '청담 스시', owner: '윤서아', amount: 4200000, period: '2024-12', processDate: '2025-01-03', status: 'rejected', approver: '관리자1' },
]

export const monthlyStats = [
  { month: '2024-09', totalRequests: 245, approved: 234, rejected: 11, totalAmount: 890000000 },
  { month: '2024-10', totalRequests: 267, approved: 251, rejected: 16, totalAmount: 920000000 },
  { month: '2024-11', totalRequests: 289, approved: 276, rejected: 13, totalAmount: 1020000000 },
  { month: '2024-12', totalRequests: 312, approved: 298, rejected: 14, totalAmount: 1150000000 },
  { month: '2025-01', totalRequests: 156, approved: 89, rejected: 5, totalAmount: 580000000 },
]