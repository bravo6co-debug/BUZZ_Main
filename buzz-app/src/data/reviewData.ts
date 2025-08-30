export interface Review {
  id: string
  storeId: string
  storeName: string
  userId: string
  userName: string
  rating: number
  comment: string
  photos: string[]
  createdAt: string
  updatedAt: string
  hasReward: boolean
  rewardPoints?: number
  rewardType?: 'point' | 'coupon' | 'cash'
  rewardAmount?: number
}

export interface ReviewStats {
  totalReviews: number
  averageRating: number
  totalRewardsEarned: number
  photoReviews: number
}

// Mock 매장 데이터
const mockStores = [
  { id: 'store-1', name: '카페 브라운' },
  { id: 'store-2', name: '맛있는 식당' },
  { id: 'store-3', name: '힐링 카페' },
  { id: 'store-4', name: '브런치 카페' },
  { id: 'store-5', name: '로컬 베이커리' }
]

// 기본 리뷰 데이터
const defaultReviews: Review[] = [
  {
    id: 'review-1',
    storeId: 'store-1',
    storeName: '카페 브라운',
    userId: 'user-1',
    userName: '김○○',
    rating: 5,
    comment: '분위기 너무 좋아요! 커피도 맛있어요. 사진 찍기에도 완벽한 장소네요.',
    photos: ['/api/placeholder/300/200', '/api/placeholder/300/200'],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2시간 전
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    hasReward: true,
    rewardType: 'point',
    rewardAmount: 100,
    rewardPoints: 100
  },
  {
    id: 'review-2',
    storeId: 'store-2',
    storeName: '맛있는 식당',
    userId: 'user-1',
    userName: '김○○',
    rating: 4,
    comment: '음식이 정말 맛있어요! 양도 많고 가격도 합리적입니다.',
    photos: ['/api/placeholder/300/200'],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1일 전
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    hasReward: true,
    rewardType: 'coupon',
    rewardAmount: 3000
  },
  {
    id: 'review-3',
    storeId: 'store-3',
    storeName: '힐링 카페',
    userId: 'user-2',
    userName: '이○○',
    rating: 4,
    comment: '사진 찍기 좋은 곳이에요',
    photos: [],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3일 전
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    hasReward: true,
    rewardType: 'point',
    rewardAmount: 50
  },
  {
    id: 'review-4',
    storeId: 'store-4',
    storeName: '브런치 카페',
    userId: 'user-1',
    userName: '김○○',
    rating: 5,
    comment: '브런치 메뉴가 정말 다양하고 맛있어요! 특히 에그베네딕트 추천합니다.',
    photos: ['/api/placeholder/300/200', '/api/placeholder/300/200', '/api/placeholder/300/200'],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5일 전
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    hasReward: true,
    rewardType: 'point',
    rewardAmount: 100,
    rewardPoints: 100
  },
  {
    id: 'review-5',
    storeId: 'store-1',
    storeName: '카페 브라운',
    userId: 'user-3',
    userName: '박○○',
    rating: 5,
    comment: '직원분들이 친절해요',
    photos: [],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1주 전
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    hasReward: true,
    rewardType: 'point',
    rewardAmount: 50
  }
]

export class ReviewService {
  private static readonly STORAGE_KEY = 'buzz_reviews'
  private static readonly CURRENT_USER_ID = 'user-1' // 현재 로그인한 사용자 ID

  static getReviews(): Review[] {
    const saved = localStorage.getItem(this.STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return defaultReviews
      }
    }
    // 처음 실행 시 기본 리뷰 저장
    this.saveReviews(defaultReviews)
    return defaultReviews
  }

  private static saveReviews(reviews: Review[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reviews))
  }

  static getReviewsByStoreId(storeId: string): Review[] {
    const reviews = this.getReviews()
    return reviews.filter(review => review.storeId === storeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  static getMyReviews(): Review[] {
    const reviews = this.getReviews()
    return reviews.filter(review => review.userId === this.CURRENT_USER_ID)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  static getReviewById(reviewId: string): Review | null {
    const reviews = this.getReviews()
    return reviews.find(review => review.id === reviewId) || null
  }

  static createReview(reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'userName'>): Review {
    const reviews = this.getReviews()
    
    const newReview: Review = {
      ...reviewData,
      id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: this.CURRENT_USER_ID,
      userName: '김○○', // 현재 사용자명
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // 리뷰 작성 보상 계산
    const rewardResult = this.calculateReward(reviewData.photos.length > 0, reviewData.comment.length)
    newReview.hasReward = rewardResult.hasReward
    newReview.rewardType = rewardResult.rewardType
    newReview.rewardAmount = rewardResult.rewardAmount
    if (rewardResult.rewardType === 'point') {
      newReview.rewardPoints = rewardResult.rewardAmount
    }

    reviews.push(newReview)
    this.saveReviews(reviews)

    return newReview
  }

  static updateReview(reviewId: string, updates: Partial<Omit<Review, 'id' | 'createdAt' | 'userId' | 'userName'>>): boolean {
    const reviews = this.getReviews()
    const reviewIndex = reviews.findIndex(review => 
      review.id === reviewId && review.userId === this.CURRENT_USER_ID
    )

    if (reviewIndex === -1) return false

    reviews[reviewIndex] = {
      ...reviews[reviewIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    this.saveReviews(reviews)
    return true
  }

  static deleteReview(reviewId: string): boolean {
    const reviews = this.getReviews()
    const filteredReviews = reviews.filter(review => 
      !(review.id === reviewId && review.userId === this.CURRENT_USER_ID)
    )

    if (filteredReviews.length === reviews.length) return false

    this.saveReviews(filteredReviews)
    return true
  }

  static getMyReviewStats(): ReviewStats {
    const myReviews = this.getMyReviews()
    
    return {
      totalReviews: myReviews.length,
      averageRating: myReviews.length > 0 ? 
        myReviews.reduce((sum, review) => sum + review.rating, 0) / myReviews.length : 0,
      totalRewardsEarned: myReviews
        .filter(review => review.hasReward && review.rewardType === 'point')
        .reduce((sum, review) => sum + (review.rewardPoints || 0), 0),
      photoReviews: myReviews.filter(review => review.photos.length > 0).length
    }
  }

  static getStoreReviewStats(storeId: string) {
    const storeReviews = this.getReviewsByStoreId(storeId)
    
    if (storeReviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      }
    }

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    let totalRating = 0

    storeReviews.forEach(review => {
      totalRating += review.rating
      ratingDistribution[review.rating as keyof typeof ratingDistribution]++
    })

    return {
      totalReviews: storeReviews.length,
      averageRating: totalRating / storeReviews.length,
      ratingDistribution
    }
  }

  // 보상 계산 로직
  private static calculateReward(hasPhoto: boolean, commentLength: number): {
    hasReward: boolean
    rewardType: 'point' | 'coupon' | 'cash'
    rewardAmount: number
  } {
    // 기본 리뷰 작성 보상
    let rewardAmount = 50

    // 사진 첨부 시 추가 보상
    if (hasPhoto) {
      rewardAmount += 50
    }

    // 긴 리뷰 (100자 이상) 추가 보상
    if (commentLength >= 100) {
      rewardAmount += 25
    }

    return {
      hasReward: true,
      rewardType: 'point',
      rewardAmount
    }
  }

  static canUserReviewStore(storeId: string): boolean {
    const myReviews = this.getMyReviews()
    // 같은 매장에 대한 리뷰가 이미 있는지 확인 (한 매장당 하나의 리뷰만 허용)
    return !myReviews.some(review => review.storeId === storeId)
  }

  static getTimeAgo(dateString: string): string {
    const now = new Date()
    const reviewDate = new Date(dateString)
    const diffInMs = now.getTime() - reviewDate.getTime()
    
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`
    } else if (diffInHours < 24) {
      return `${diffInHours}시간 전`
    } else if (diffInDays < 7) {
      return `${diffInDays}일 전`
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7)
      return `${weeks}주 전`
    } else {
      const months = Math.floor(diffInDays / 30)
      return `${months}개월 전`
    }
  }

  static getMockStores() {
    return mockStores
  }
}