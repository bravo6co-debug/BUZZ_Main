import { supabase } from '../lib/supabase';

export interface TimeSlot {
  morning: boolean;   // 06:00-11:00
  lunch: boolean;     // 11:00-14:00
  dinner: boolean;    // 17:00-21:00
  night: boolean;     // 21:00-02:00
}

export interface BusinessInfo {
  id: string;
  name: string;
  owner_id: string;
  category: string;
  address: string;
  phone: string;
  description?: string;
  business_number: string;
  business_license_url?: string;
  display_time_slots?: TimeSlot;
  verification_status: 'pending' | 'approved' | 'rejected';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  id?: string;
  business_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

class BusinessService {
  // 현재 비즈니스 정보 가져오기
  async getCurrentBusiness(): Promise<BusinessInfo | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching business:', error);
      return null;
    }
  }

  // 비즈니스 정보 업데이트
  async updateBusinessInfo(businessId: string, updates: Partial<BusinessInfo>) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', businessId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error updating business:', error);
      return { success: false, error: error.message };
    }
  }

  // 영업시간 조회
  async getBusinessHours(businessId: string): Promise<BusinessHours[]> {
    try {
      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .eq('business_id', businessId)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      
      // 데이터가 없으면 기본값 생성
      if (!data || data.length === 0) {
        return this.getDefaultBusinessHours(businessId);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching business hours:', error);
      return this.getDefaultBusinessHours(businessId);
    }
  }

  // 기본 영업시간 생성
  private getDefaultBusinessHours(businessId: string): BusinessHours[] {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days.map((_, index) => ({
      business_id: businessId,
      day_of_week: index,
      open_time: '09:00',
      close_time: '22:00',
      is_closed: index === 0 // 일요일 휴무
    }));
  }

  // 영업시간 업데이트
  async updateBusinessHours(businessId: string, hours: BusinessHours[]) {
    try {
      // 기존 데이터 삭제
      await supabase
        .from('business_hours')
        .delete()
        .eq('business_id', businessId);

      // 새 데이터 삽입
      const { data, error } = await supabase
        .from('business_hours')
        .insert(hours.map(h => ({
          business_id: businessId,
          day_of_week: h.day_of_week,
          open_time: h.open_time,
          close_time: h.close_time,
          is_closed: h.is_closed
        })))
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error updating business hours:', error);
      return { success: false, error: error.message };
    }
  }

  // 현재 영업 상태 확인
  isBusinessOpen(hours: BusinessHours[]): boolean {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const todayHours = hours.find(h => h.day_of_week === currentDay);
    if (!todayHours || todayHours.is_closed) return false;
    
    return currentTime >= todayHours.open_time && currentTime <= todayHours.close_time;
  }

  // 승인 상태 확인
  async checkApprovalStatus(): Promise<'pending' | 'approved' | 'rejected' | null> {
    try {
      const business = await this.getCurrentBusiness();
      return business?.verification_status || null;
    } catch (error) {
      console.error('Error checking approval status:', error);
      return null;
    }
  }

  // 승인 대기 중인지 확인
  async isPendingApproval(): Promise<boolean> {
    const status = await this.checkApprovalStatus();
    return status === 'pending';
  }

  // 비즈니스 활성화 상태 변경
  async toggleBusinessActive(businessId: string, isActive: boolean) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update({ is_active: isActive })
        .eq('id', businessId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error toggling business active:', error);
      return { success: false, error: error.message };
    }
  }

  // 승인 요청 제출
  async submitForApproval(businessId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .update({ 
          verification_status: 'pending',
          verification_requested_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', businessId)
        .select()
        .single();

      if (error) throw error;

      // 알림 생성
      await supabase
        .from('notifications')
        .insert({
          user_id: data.owner_id,
          type: 'approval',
          title: '승인 요청 접수',
          message: '비즈니스 승인 요청이 접수되었습니다. 1-2일 내에 검토 결과를 알려드리겠습니다.',
          read: false
        });

      return { success: true };
    } catch (error: any) {
      console.error('Error submitting for approval:', error);
      return { success: false, error: error.message };
    }
  }

  // 문서 업로드 상태 업데이트
  async updateDocumentStatus(
    businessId: string, 
    documentType: 'business_license' | 'operation_permit' | 'bank_account',
    fileUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 기존 문서 정보 가져오기
      const { data: business, error: fetchError } = await supabase
        .from('businesses')
        .select('documents')
        .eq('id', businessId)
        .single();

      if (fetchError) throw fetchError;

      const documents = business.documents || {};
      documents[documentType] = fileUrl;

      // 문서 정보 업데이트
      const { error } = await supabase
        .from('businesses')
        .update({ documents })
        .eq('id', businessId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error updating document status:', error);
      return { success: false, error: error.message };
    }
  }

  // 노출 시간대 업데이트
  async updateDisplayTimeSlots(
    businessId: string, 
    timeSlots: TimeSlot
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ display_time_slots: timeSlots })
        .eq('id', businessId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error updating display time slots:', error);
      return { success: false, error: error.message };
    }
  }

  // 비즈니스 등록 시 시간대 포함 등록
  async createBusinessWithTimeSlots(businessData: Partial<BusinessInfo>): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('businesses')
        .insert({
          ...businessData,
          owner_id: user.id,
          verification_status: 'pending',
          is_active: false
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error creating business with time slots:', error);
      return { success: false, error: error.message };
    }
  }
}

export const businessService = new BusinessService();