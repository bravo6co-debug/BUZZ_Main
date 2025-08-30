import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Clock, Save, Loader2, AlertCircle } from 'lucide-react';
import { businessService, BusinessHours } from '../services/business.service';

const DAYS_OF_WEEK = [
  { value: 0, label: '일요일' },
  { value: 1, label: '월요일' },
  { value: 2, label: '화요일' },
  { value: 3, label: '수요일' },
  { value: 4, label: '목요일' },
  { value: 5, label: '금요일' },
  { value: 6, label: '토요일' }
];

export function BusinessHoursScreen() {
  const [business, setBusiness] = useState<any>(null);
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async () => {
    setLoading(true);
    
    const businessData = await businessService.getCurrentBusiness();
    if (businessData) {
      setBusiness(businessData);
      
      // 영업시간 데이터 로드
      const hours = await businessService.getBusinessHours(businessData.id);
      
      // 모든 요일에 대한 기본값 설정
      const defaultHours = DAYS_OF_WEEK.map(day => {
        const existing = hours.find(h => h.day_of_week === day.value);
        return existing || {
          id: '',
          business_id: businessData.id,
          day_of_week: day.value,
          open_time: '09:00',
          close_time: '18:00',
          is_closed: false,
          break_start: null,
          break_end: null
        };
      });
      
      setBusinessHours(defaultHours);
    }
    
    setLoading(false);
  };

  const handleTimeChange = (dayIndex: number, field: keyof BusinessHours, value: any) => {
    const updatedHours = [...businessHours];
    updatedHours[dayIndex] = {
      ...updatedHours[dayIndex],
      [field]: value
    };
    setBusinessHours(updatedHours);
  };

  const handleSave = async () => {
    if (!business) return;
    
    setSaving(true);
    
    const result = await businessService.updateBusinessHours(business.id, businessHours);
    
    if (result.success) {
      alert('영업시간이 저장되었습니다.');
      await loadBusinessData(); // 데이터 새로고침
    } else {
      alert(`저장 실패: ${result.error}`);
    }
    
    setSaving(false);
  };

  const applyToWeekdays = () => {
    const mondayHours = businessHours.find(h => h.day_of_week === 1);
    if (!mondayHours) return;
    
    const updatedHours = businessHours.map(hour => {
      if (hour.day_of_week >= 1 && hour.day_of_week <= 5) {
        return {
          ...hour,
          open_time: mondayHours.open_time,
          close_time: mondayHours.close_time,
          is_closed: mondayHours.is_closed,
          break_start: mondayHours.break_start,
          break_end: mondayHours.break_end
        };
      }
      return hour;
    });
    
    setBusinessHours(updatedHours);
  };

  const applyToWeekend = () => {
    const saturdayHours = businessHours.find(h => h.day_of_week === 6);
    if (!saturdayHours) return;
    
    const updatedHours = businessHours.map(hour => {
      if (hour.day_of_week === 0 || hour.day_of_week === 6) {
        return {
          ...hour,
          open_time: saturdayHours.open_time,
          close_time: saturdayHours.close_time,
          is_closed: saturdayHours.is_closed,
          break_start: saturdayHours.break_start,
          break_end: saturdayHours.break_end
        };
      }
      return hour;
    });
    
    setBusinessHours(updatedHours);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-xl font-semibold">영업시간 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">매장 영업시간을 설정하세요</p>
      </div>

      {/* Business Info */}
      {business && (
        <Card className="p-4 bg-primary/5">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold">{business.name}</h3>
              <p className="text-sm text-muted-foreground">{business.category || '카페'}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={applyToWeekdays}
        >
          평일 동일 적용
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={applyToWeekend}
        >
          주말 동일 적용
        </Button>
      </div>

      {/* Business Hours */}
      <div className="space-y-3">
        {businessHours.map((hours, index) => {
          const day = DAYS_OF_WEEK.find(d => d.value === hours.day_of_week);
          const isToday = new Date().getDay() === hours.day_of_week;
          
          return (
            <Card 
              key={hours.day_of_week} 
              className={`p-4 ${isToday ? 'border-primary' : ''}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium">
                      {day?.label}
                      {isToday && (
                        <span className="ml-2 text-xs text-primary">(오늘)</span>
                      )}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">휴무</label>
                    <Switch
                      checked={hours.is_closed}
                      onCheckedChange={(checked) => 
                        handleTimeChange(index, 'is_closed', checked)
                      }
                    />
                  </div>
                </div>
                
                {!hours.is_closed && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">오픈</label>
                      <input
                        type="time"
                        value={hours.open_time || '09:00'}
                        onChange={(e) => 
                          handleTimeChange(index, 'open_time', e.target.value)
                        }
                        className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">마감</label>
                      <input
                        type="time"
                        value={hours.close_time || '18:00'}
                        onChange={(e) => 
                          handleTimeChange(index, 'close_time', e.target.value)
                        }
                        className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                      />
                    </div>
                  </div>
                )}
                
                {!hours.is_closed && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-sm text-muted-foreground">브레이크 타임</label>
                      <Switch
                        checked={!!hours.break_start}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleTimeChange(index, 'break_start', '14:00');
                            handleTimeChange(index, 'break_end', '15:00');
                          } else {
                            handleTimeChange(index, 'break_start', null);
                            handleTimeChange(index, 'break_end', null);
                          }
                        }}
                      />
                    </div>
                    
                    {hours.break_start && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">시작</label>
                          <input
                            type="time"
                            value={hours.break_start || '14:00'}
                            onChange={(e) => 
                              handleTimeChange(index, 'break_start', e.target.value)
                            }
                            className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">종료</label>
                          <input
                            type="time"
                            value={hours.break_end || '15:00'}
                            onChange={(e) => 
                              handleTimeChange(index, 'break_end', e.target.value)
                            }
                            className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {hours.is_closed && (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                    <AlertCircle className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">휴무일</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Save Button */}
      <Button 
        className="w-full h-12" 
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            저장 중...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            영업시간 저장
          </>
        )}
      </Button>

      {/* Notice */}
      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs text-muted-foreground text-center">
          영업시간 변경사항은 즉시 고객에게 반영됩니다
        </p>
      </div>
    </div>
  );
}