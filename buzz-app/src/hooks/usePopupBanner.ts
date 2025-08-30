// 팝업 배너 Hook
import { useState, useEffect } from 'react';

export interface PopupBanner {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  type: 'center' | 'bottom' | 'top' | 'fullscreen';
  priority: number;
  displayFrequency: 'once_ever' | 'once_per_day' | 'once_per_week' | 'always';
  targetConditions?: {
    minVisits?: number;
    university?: string;
    joinedWithin?: number;
  };
  ctaButton?: {
    text: string;
    link: string;
  };
  expiresAt?: string;
}

export const usePopupBanner = () => {
  const [activePopups, setActivePopups] = useState<PopupBanner[]>([]);
  const [currentPopup, setCurrentPopup] = useState<PopupBanner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivePopups();
  }, []);

  const loadActivePopups = async () => {
    try {
      setLoading(true);
      
      // Mock 팝업 데이터 (실제 백엔드 API 구현시 교체)
      // 하드코딩된 "첫 구매시 5000원 할인쿠폰" 팝업 제거됨
      const mockPopups: PopupBanner[] = [];
      
      const filteredPopups = mockPopups.filter((popup: PopupBanner) => {
        return checkFrequency(popup) && checkTargeting(popup);
      });
      
      // 우선순위 정렬
      filteredPopups.sort((a: PopupBanner, b: PopupBanner) => b.priority - a.priority);
      
      setActivePopups(filteredPopups);
      if (filteredPopups.length > 0) {
        setCurrentPopup(filteredPopups[0]);
      }
    } catch (error) {
      console.error('Failed to load popups:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFrequency = (popup: PopupBanner): boolean => {
    const lastShown = localStorage.getItem(`popup_${popup.id}_lastShown`);
    
    if (!lastShown) return true;
    
    const lastShownDate = new Date(lastShown);
    const now = new Date();
    
    switch (popup.displayFrequency) {
      case 'once_ever':
        return false;
      case 'once_per_day':
        return !isSameDay(lastShownDate, now);
      case 'once_per_week':
        return !isSameWeek(lastShownDate, now);
      case 'always':
        return true;
      default:
        return true;
    }
  };

  const checkTargeting = (popup: PopupBanner): boolean => {
    if (!popup.targetConditions) return true;
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const conditions = popup.targetConditions;
    
    if (conditions.minVisits) {
      const visitCount = parseInt(localStorage.getItem('visitCount') || '0');
      if (visitCount < conditions.minVisits) return false;
    }
    
    if (conditions.university && user.university !== conditions.university) {
      return false;
    }
    
    if (conditions.joinedWithin) {
      const joinedDate = new Date(user.joinedAt || Date.now());
      const daysSinceJoined = Math.floor((Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceJoined > conditions.joinedWithin) return false;
    }
    
    return true;
  };

  const dismissPopup = async (popupId: string, action: 'close' | 'click' = 'close') => {
    // 노출 기록
    localStorage.setItem(`popup_${popupId}_lastShown`, new Date().toISOString());
    
    // 서버에 액션 기록 (실제 구현시 백엔드 API 추가)
    console.log('Popup action tracked:', { popupId, action });
    
    // 다음 팝업 표시
    const remainingPopups = activePopups.filter(p => p.id !== popupId);
    setActivePopups(remainingPopups);
    
    if (remainingPopups.length > 0) {
      setCurrentPopup(remainingPopups[0]);
    } else {
      setCurrentPopup(null);
    }
  };

  const trackView = async (popupId: string) => {
    // 팝업 노출 추적 (실제 구현시 백엔드 API 추가)
    console.log('Popup view tracked:', { popupId, action: 'view' });
  };

  return {
    currentPopup,
    activePopups,
    loading,
    dismissPopup,
    trackView,
  };
};

// 날짜 비교 유틸리티
const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

const isSameWeek = (date1: Date, date2: Date): boolean => {
  const oneDay = 24 * 60 * 60 * 1000;
  const firstDay = new Date(date1.getFullYear(), 0, 1);
  const week1 = Math.ceil((((date1.getTime() - firstDay.getTime()) / oneDay) + firstDay.getDay() + 1) / 7);
  const week2 = Math.ceil((((date2.getTime() - firstDay.getTime()) / oneDay) + firstDay.getDay() + 1) / 7);
  return week1 === week2 && date1.getFullYear() === date2.getFullYear();
};