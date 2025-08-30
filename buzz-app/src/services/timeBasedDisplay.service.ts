import { Business } from './business.service';

export interface TimeSlot {
  morning: boolean;   // 06:00-11:00
  lunch: boolean;     // 11:00-14:00
  dinner: boolean;    // 17:00-21:00
  night: boolean;     // 21:00-02:00
}

export interface BusinessWithTimeSlots extends Business {
  displayTimeSlots?: TimeSlot;
}

class TimeBasedDisplayService {
  // 현재 시간에 해당하는 시간대 반환
  getCurrentTimeSlot(): keyof TimeSlot | null {
    const now = new Date();
    const hours = now.getHours();
    
    if (hours >= 6 && hours < 11) {
      return 'morning';
    } else if (hours >= 11 && hours < 14) {
      return 'lunch';
    } else if (hours >= 17 && hours < 21) {
      return 'dinner';
    } else if (hours >= 21 || hours < 2) {
      return 'night';
    }
    
    return null; // 노출 시간대 외
  }

  // 현재 시간대에 노출되어야 할 비즈니스 필터링
  filterByCurrentTime(businesses: BusinessWithTimeSlots[]): BusinessWithTimeSlots[] {
    const currentSlot = this.getCurrentTimeSlot();
    
    if (!currentSlot) {
      // 노출 시간대가 아닌 경우, 24시간 노출 가게만 표시
      return businesses.filter(business => {
        if (!business.displayTimeSlots) return true; // 시간대 설정이 없으면 항상 노출
        
        // 모든 시간대가 선택된 경우 (24시간 노출)
        return business.displayTimeSlots.morning && 
               business.displayTimeSlots.lunch && 
               business.displayTimeSlots.dinner && 
               business.displayTimeSlots.night;
      });
    }
    
    return businesses.filter(business => {
      if (!business.displayTimeSlots) return true; // 시간대 설정이 없으면 항상 노출
      return business.displayTimeSlots[currentSlot];
    });
  }

  // 특정 시간대의 비즈니스 필터링
  filterByTimeSlot(businesses: BusinessWithTimeSlots[], slot: keyof TimeSlot): BusinessWithTimeSlots[] {
    return businesses.filter(business => {
      if (!business.displayTimeSlots) return true;
      return business.displayTimeSlots[slot];
    });
  }

  // 공정한 노출을 위한 순서 섞기 (일별 시드 기반)
  shuffleForFairness<T>(items: T[]): T[] {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    // 시드 기반 셔플 (같은 날에는 같은 순서)
    const shuffled = [...items];
    let currentIndex = shuffled.length;
    let randomIndex;
    
    // 시드 기반 난수 생성
    const random = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    
    while (currentIndex !== 0) {
      randomIndex = Math.floor(random(seed + currentIndex) * currentIndex);
      currentIndex--;
      [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
    }
    
    return shuffled;
  }

  // 시간대별 추천 가게 선정
  getTimeBasedRecommendations(businesses: BusinessWithTimeSlots[], limit: number = 5): BusinessWithTimeSlots[] {
    const currentSlot = this.getCurrentTimeSlot();
    
    if (!currentSlot) return [];
    
    // 현재 시간대에 노출되는 가게들
    const availableBusinesses = this.filterByCurrentTime(businesses);
    
    // 평점과 리뷰 수를 기준으로 점수 계산
    const scoredBusinesses = availableBusinesses.map(business => ({
      business,
      score: (business.rating || 0) * 0.7 + Math.min((business.review_count || 0) / 10, 3) * 0.3
    }));
    
    // 점수 기준 정렬
    scoredBusinesses.sort((a, b) => b.score - a.score);
    
    // 상위 가게들 중에서 공정하게 섞기
    const topBusinesses = scoredBusinesses.slice(0, limit * 2).map(item => item.business);
    const shuffled = this.shuffleForFairness(topBusinesses);
    
    return shuffled.slice(0, limit);
  }

  // 다음 시간대 정보 가져오기
  getNextTimeSlot(): { slot: keyof TimeSlot; startsIn: string } | null {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    let nextSlot: keyof TimeSlot;
    let nextHour: number;
    
    if (hours < 6) {
      nextSlot = 'morning';
      nextHour = 6;
    } else if (hours < 11) {
      nextSlot = 'lunch';
      nextHour = 11;
    } else if (hours < 14) {
      nextSlot = 'dinner';
      nextHour = 17;
    } else if (hours < 17) {
      nextSlot = 'dinner';
      nextHour = 17;
    } else if (hours < 21) {
      nextSlot = 'night';
      nextHour = 21;
    } else {
      nextSlot = 'morning';
      nextHour = 30; // 다음날 오전 6시
    }
    
    const hoursLeft = (nextHour - hours - 1 + 24) % 24;
    const minutesLeft = 60 - minutes;
    
    const totalMinutes = hoursLeft * 60 + minutesLeft;
    const displayHours = Math.floor(totalMinutes / 60);
    const displayMinutes = totalMinutes % 60;
    
    return {
      slot: nextSlot,
      startsIn: displayHours > 0 
        ? `${displayHours}시간 ${displayMinutes}분` 
        : `${displayMinutes}분`
    };
  }

  // 시간대 한국어 이름
  getTimeSlotName(slot: keyof TimeSlot): string {
    const names = {
      morning: '아침',
      lunch: '점심',
      dinner: '저녁',
      night: '밤'
    };
    return names[slot];
  }

  // 현재 시간대 메시지
  getCurrentTimeMessage(): string {
    const currentSlot = this.getCurrentTimeSlot();
    
    if (!currentSlot) {
      return '지금은 휴식 시간입니다 😴';
    }
    
    const messages = {
      morning: '좋은 아침입니다! ☀️',
      lunch: '맛있는 점심 드세요! 🍚',
      dinner: '즐거운 저녁 시간! 🌆',
      night: '늦은 시간까지 함께해요! 🌙'
    };
    
    return messages[currentSlot];
  }
}

export const timeBasedDisplayService = new TimeBasedDisplayService();