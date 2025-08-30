import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Checkbox } from "./ui/checkbox";
import FileUploadComponent from "./FileUploadComponent";
import { Building2, User, Phone, MapPin, FileText, Loader2, CheckCircle, AlertCircle, Clock, Sun, Coffee, Moon } from "lucide-react";
import { authApi, uploadApi } from "../services/api.service";
import { storageService } from "../services/storage.service";
import { supabase } from "../lib/supabase";
import smsService from '../services/smsService';
import { toast } from "sonner";

interface BusinessRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (registrationData: BusinessRegistrationData) => void;
}

export interface BusinessRegistrationData {
  // 기본 사업자 정보
  businessName: string;
  businessNumber: string;
  ownerName: string;
  phoneNumber: string;
  email: string;
  
  // 주소 정보
  address: string;
  detailAddress: string;
  postalCode: string;
  
  // 사업 정보
  category: string;
  description: string;
  
  // 노출 시간대 설정
  displayTimeSlots: {
    morning: boolean;   // 아침 (06:00-11:00)
    lunch: boolean;     // 점심 (11:00-14:00)
    dinner: boolean;    // 저녁 (17:00-21:00)
    night: boolean;     // 밤 (21:00-02:00)
  };
  
  // 첨부 파일
  businessRegistration: File[]; // 사업자등록증
  bankbook: File[]; // 통장사본
  idCard: File[]; // 신분증 사본
  
  // 동의 사항
  termsAgreed: boolean;
  privacyAgreed: boolean;
  marketingAgreed: boolean;
}

const categories = [
  "음식점", "카페", "편의점", "마트", "뷰티/미용", 
  "의료/약국", "교육", "스포츠/레저", "서비스", "기타"
];

export default function BusinessRegistrationModal({ isOpen, onClose, onSubmit }: BusinessRegistrationModalProps) {
  const [formData, setFormData] = useState<Partial<BusinessRegistrationData>>({
    businessName: '',
    businessNumber: '',
    ownerName: '',
    phoneNumber: '',
    email: '',
    address: '',
    detailAddress: '',
    postalCode: '',
    category: '',
    description: '',
    displayTimeSlots: {
      morning: false,
      lunch: false,
      dinner: false,
      night: false
    },
    businessRegistration: [],
    bankbook: [],
    idCard: [],
    termsAgreed: false,
    privacyAgreed: false,
    marketingAgreed: false,
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5; // 단계 추가
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleInputChange = (field: keyof BusinessRegistrationData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.businessName &&
          formData.businessNumber &&
          formData.ownerName &&
          formData.phoneNumber &&
          formData.email
        );
      case 2:
        return !!(
          formData.address &&
          formData.postalCode &&
          formData.category &&
          formData.displayTimeSlots && (
            formData.displayTimeSlots.morning ||
            formData.displayTimeSlots.lunch ||
            formData.displayTimeSlots.dinner ||
            formData.displayTimeSlots.night
          )
        );
      case 3:
        // 개발/테스트 모드에서는 서류 없이도 진행 가능
        return true;
      case 4:
        return !!(
          formData.termsAgreed &&
          formData.privacyAgreed
        );
      case 5:
        return true; // 최종 확인 단계
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!isStepValid(4) || isSubmitting) return;
    
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // 1단계: 파일 업로드 (Supabase Storage 사용) - 개발/테스트 모드에서는 스킵
      let uploadedDocuments: any[] = [];
      const businessId = `business_${Date.now()}`; // 임시 비즈니스 ID
      
      console.log('파일 업로드 단계 - 개발 모드에서는 스킵');
      
      // 사업자 등록증 업로드 (있는 경우만)
      if (formData.businessRegistration && formData.businessRegistration.length > 0) {
        const file = formData.businessRegistration[0];
        const result = await storageService.uploadBusinessDocument(file, businessId);
        
        if (result.success) {
          uploadedDocuments.push({
            type: 'business_registration',
            url: result.url,
            path: result.path
          });
        } else {
          throw new Error(result.error || '사업자 등록증 업로드 실패');
        }
      }
      
      // 통장 사본 업로드 (business-docs 버킷 사용)
      if (formData.bankbook && formData.bankbook.length > 0) {
        const file = formData.bankbook[0];
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `${businessId}/bankbook-${timestamp}.${fileExt}`;
        
        // 직접 Supabase에 업로드
        const { data, error } = await supabase.storage
          .from('business-docs')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (error) throw error;
        
        const { data: signedUrlData } = await supabase.storage
          .from('business-docs')
          .createSignedUrl(fileName, 3600);
          
        if (signedUrlData) {
          uploadedDocuments.push({
            type: 'bankbook',
            url: signedUrlData.signedUrl,
            path: fileName
          });
        }
      }
      
      // 신분증 사본 업로드 (business-docs 버킷 사용)
      if (formData.idCard && formData.idCard.length > 0) {
        const file = formData.idCard[0];
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `${businessId}/idcard-${timestamp}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('business-docs')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (error) throw error;
        
        const { data: signedUrlData } = await supabase.storage
          .from('business-docs')
          .createSignedUrl(fileName, 3600);
          
        if (signedUrlData) {
          uploadedDocuments.push({
            type: 'id_card',
            url: signedUrlData.signedUrl,
            path: fileName
          });
        }
      }
      
      console.log('Files uploaded successfully to Supabase:', uploadedDocuments);

      // 2단계: 비즈니스 등록 신청
      const applicationData = {
        email: formData.email,
        password: 'temp_password_' + Date.now(), // 임시 비밀번호 (SMS로 실제 비밀번호 전송)
        businessInfo: {
          name: formData.businessName,
          registrationNumber: formData.businessNumber,
          category: formData.category,
          address: `${formData.address} ${formData.detailAddress || ''}`.trim(),
          phone: formData.phoneNumber,
          description: formData.description,
          bankAccount: {
            // 은행 계좌 정보는 추후 추가 입력받을 수 있음
            holder: formData.ownerName
          }
        },
        displayTimeSlots: formData.displayTimeSlots,
        documents: uploadedDocuments
      };

      console.log('Submitting application:', applicationData);
      
      // Supabase를 직접 사용하여 업무용 애플리케이션 등록
      try {
        // business_applications 테이블에 직접 삽입 (최종 통합 스키마)
        const { data, error } = await supabase
          .from('business_applications')
          .insert({
            business_name: formData.businessName,
            business_number: formData.businessNumber,
            owner_name: formData.ownerName,
            phone: formData.phoneNumber,
            email: formData.email,
            category: formData.category,
            address: `${formData.address} ${formData.detailAddress || ''}`.trim(),
            description: formData.description || '',
            password_hash: null, // 추후 사용자 계정 생성 시 설정
            bank_info: {
              account_holder: formData.ownerName
            },
            documents: uploadedDocuments,
            display_time_slots: formData.displayTimeSlots,
            status: 'pending'
          })
          .select()
          .single();

        if (error) throw error;

        const result = {
          success: true,
          data,
          message: '신청이 성공적으로 접수되었습니다.',
          timestamp: new Date().toISOString()
        };
        
        console.log('Direct Supabase application result:', result);

        if (result.success) {
          setSubmitSuccess(true);
          console.log('Application submitted successfully');
          
          // SMS 접수 확인 전송
          try {
            await smsService.sendApplicationConfirmSms({
              business_name: formData.businessName,
              owner_name: formData.ownerName,
              business_number: formData.businessNumber,
              phone: formData.phoneNumber
            });
          } catch (smsError) {
            console.error('SMS 전송 중 오류:', smsError);
          }
          
          // 성공 시 부모 컴포넌트 콜백 호출
          onSubmit?.(formData as BusinessRegistrationData);
          
          // 2초 후 모달 닫기
          setTimeout(() => {
            onClose();
          }, 2000);
        } else {
          throw new Error(result.error?.message || '신청서 제출에 실패했습니다');
        }
      } catch (dbError: any) {
        console.error('Database insertion error:', dbError);
        throw new Error(dbError?.message || '데이터베이스 저장 중 오류가 발생했습니다');
      }

    } catch (error: any) {
      console.error('Submission error:', error);
      setSubmitError(
        error?.error?.message || 
        error?.message || 
        '신청서 제출 중 오류가 발생했습니다'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 size={20} />
              기본 사업자 정보
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="businessName">사업자명 (상호) *</Label>
                <Input
                  id="businessName"
                  value={formData.businessName || ''}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  placeholder="예: 카페 브라운"
                />
              </div>
              
              <div>
                <Label htmlFor="businessNumber">사업자등록번호 *</Label>
                <Input
                  id="businessNumber"
                  value={formData.businessNumber || ''}
                  onChange={(e) => handleInputChange('businessNumber', e.target.value)}
                  placeholder="000-00-00000"
                />
              </div>
              
              <div>
                <Label htmlFor="ownerName">대표자명 *</Label>
                <Input
                  id="ownerName"
                  value={formData.ownerName || ''}
                  onChange={(e) => handleInputChange('ownerName', e.target.value)}
                  placeholder="홍길동"
                />
              </div>
              
              <div>
                <Label htmlFor="phoneNumber">연락처 *</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber || ''}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="010-0000-0000"
                />
              </div>
              
              <div>
                <Label htmlFor="email">이메일 *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="example@email.com"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin size={20} />
              사업장 정보
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="postalCode">우편번호 *</Label>
                <div className="flex gap-2">
                  <Input
                    id="postalCode"
                    value={formData.postalCode || ''}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    placeholder="12345"
                  />
                  <Button variant="outline">주소검색</Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="address">주소 *</Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="서울시 강남구 테헤란로 123"
                />
              </div>
              
              <div>
                <Label htmlFor="detailAddress">상세주소</Label>
                <Input
                  id="detailAddress"
                  value={formData.detailAddress || ''}
                  onChange={(e) => handleInputChange('detailAddress', e.target.value)}
                  placeholder="101호"
                />
              </div>
              
              <div>
                <Label htmlFor="category">업종 *</Label>
                <select
                  id="category"
                  value={formData.category || ''}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">업종을 선택하세요</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Clock size={18} />
                  노출 시간대 설정 *
                </Label>
                <p className="text-sm text-gray-600 mb-3">
                  매장을 노출하고 싶은 시간대를 선택하세요 (복수 선택 가능)
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="morning"
                      checked={formData.displayTimeSlots?.morning || false}
                      onCheckedChange={(checked) => 
                        handleInputChange('displayTimeSlots', {
                          ...formData.displayTimeSlots,
                          morning: checked
                        })
                      }
                    />
                    <Label 
                      htmlFor="morning" 
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Sun className="w-4 h-4 text-yellow-500" />
                      <span>아침 (06:00 - 11:00)</span>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="lunch"
                      checked={formData.displayTimeSlots?.lunch || false}
                      onCheckedChange={(checked) => 
                        handleInputChange('displayTimeSlots', {
                          ...formData.displayTimeSlots,
                          lunch: checked
                        })
                      }
                    />
                    <Label 
                      htmlFor="lunch" 
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Sun className="w-4 h-4 text-orange-500" />
                      <span>점심 (11:00 - 14:00)</span>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="dinner"
                      checked={formData.displayTimeSlots?.dinner || false}
                      onCheckedChange={(checked) => 
                        handleInputChange('displayTimeSlots', {
                          ...formData.displayTimeSlots,
                          dinner: checked
                        })
                      }
                    />
                    <Label 
                      htmlFor="dinner" 
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Coffee className="w-4 h-4 text-purple-500" />
                      <span>저녁 (17:00 - 21:00)</span>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="night"
                      checked={formData.displayTimeSlots?.night || false}
                      onCheckedChange={(checked) => 
                        handleInputChange('displayTimeSlots', {
                          ...formData.displayTimeSlots,
                          night: checked
                        })
                      }
                    />
                    <Label 
                      htmlFor="night" 
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Moon className="w-4 h-4 text-blue-500" />
                      <span>밤 (21:00 - 02:00)</span>
                    </Label>
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">사업 설명</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="사업에 대한 간단한 설명을 입력하세요"
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText size={20} />
              서류 첨부 (선택)
            </h3>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
              <p className="text-sm text-blue-800">
                <strong>📋 서류 업로드 안내</strong><br />
                서류는 나중에 설정 메뉴에서도 업로드하실 수 있습니다.<br />
                지금 업로드하지 않아도 가입 신청이 가능합니다.
              </p>
            </div>
            
            <FileUploadComponent
              label="사업자등록증 (선택)"
              description="사업자등록증을 업로드해주세요 (나중에 설정에서 업로드 가능)"
              acceptedTypes={['image/jpeg', 'image/png', 'application/pdf']}
              maxFiles={1}
              maxSize={5}
              required={false}
              onFilesChange={(files) => handleInputChange('businessRegistration', files)}
            />
            
            <FileUploadComponent
              label="통장사본 (선택)"
              description="사업자 명의의 통장사본을 업로드해주세요 (나중에 설정에서 업로드 가능)"
              acceptedTypes={['image/jpeg', 'image/png', 'application/pdf']}
              maxFiles={1}
              maxSize={5}
              required={false}
              onFilesChange={(files) => handleInputChange('bankbook', files)}
            />
            
            <FileUploadComponent
              label="대표자 신분증 (선택)"
              description="대표자 신분증 사본을 업로드해주세요 (나중에 설정에서 업로드 가능)"
              acceptedTypes={['image/jpeg', 'image/png', 'application/pdf']}
              maxFiles={1}
              maxSize={5}
              required={false}
              onFilesChange={(files) => handleInputChange('idCard', files)}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">약관 동의</h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <input
                  type="checkbox"
                  id="termsAgreed"
                  checked={formData.termsAgreed || false}
                  onChange={(e) => handleInputChange('termsAgreed', e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="termsAgreed" className="font-medium cursor-pointer">
                    이용약관 동의 (필수)
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    버즈 비즈니스 플랫폼 이용약관에 동의합니다.
                  </p>
                </div>
                <Button variant="outline" size="sm">보기</Button>
              </div>
              
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <input
                  type="checkbox"
                  id="privacyAgreed"
                  checked={formData.privacyAgreed || false}
                  onChange={(e) => handleInputChange('privacyAgreed', e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="privacyAgreed" className="font-medium cursor-pointer">
                    개인정보 처리방침 동의 (필수)
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    개인정보 수집 및 이용에 동의합니다.
                  </p>
                </div>
                <Button variant="outline" size="sm">보기</Button>
              </div>
              
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <input
                  type="checkbox"
                  id="marketingAgreed"
                  checked={formData.marketingAgreed || false}
                  onChange={(e) => handleInputChange('marketingAgreed', e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="marketingAgreed" className="font-medium cursor-pointer">
                    마케팅 정보 수신 동의 (선택)
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    이벤트, 혜택 등 마케팅 정보 수신에 동의합니다.
                  </p>
                </div>
              </div>
            </div>
            
            {/* 제출 상태 표시 */}
            {submitSuccess ? (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-green-800 font-medium">신청이 완료되었습니다!</p>
                </div>
                <p className="text-sm text-green-700 mt-2">
                  심사 결과는 영업일 기준 1-3일 내에 SMS로 안내드립니다.
                </p>
              </div>
            ) : submitError ? (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-800 font-medium">신청 실패</p>
                </div>
                <p className="text-sm text-red-700 mt-2">{submitError}</p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>심사 안내</strong><br />
                    제출해주신 서류를 바탕으로 심사가 진행되며, 
                    승인까지 영업일 기준 1-3일 소요됩니다.
                  </p>
                </div>
                
                {/* 가입 버튼 강조 */}
                <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 animate-pulse">
                  <div className="text-center">
                    <div className="text-4xl mb-3">👇</div>
                    <p className="text-xl font-bold text-green-700 mb-2">
                      모든 정보를 확인하셨나요?
                    </p>
                    <p className="text-lg text-gray-700">
                      아래의 <span className="text-green-600 font-bold">"🚀 가입 신청하기"</span> 버튼을 클릭하여
                    </p>
                    <p className="text-lg text-gray-700">
                      사업자 등록을 완료하세요!
                    </p>
                    <div className="text-4xl mt-3">⬇️</div>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 size={20} />
            사업자 등록 신청
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === currentStep
                    ? 'bg-blue-600 text-white'
                    : step < currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
              {step < totalSteps && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-200 bg-gray-50 px-6 py-4 -mx-6 -mb-6 mt-6 rounded-b-lg">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onClose : () => setCurrentStep(currentStep - 1)}
            className="px-6 py-2 text-gray-600 border-gray-300 hover:bg-gray-100"
          >
            {currentStep === 1 ? '취소' : '이전'}
          </Button>
          
          <div className="flex gap-3">
            {currentStep < totalSteps ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!isStepValid(currentStep)}
                className="px-10 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-lg shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  minWidth: '180px',
                  border: '2px solid #3b82f6',
                  borderRadius: '10px',
                  boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)'
                }}
              >
                다음 단계로 →
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!isStepValid(currentStep) || isSubmitting || submitSuccess}
                className="px-12 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-black text-2xl shadow-2xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed animate-pulse"
                style={{
                  minWidth: '200px',
                  border: '3px solid #22c55e',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(34, 197, 94, 0.3)'
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    신청 처리 중...
                  </>
                ) : submitSuccess ? (
                  <>
                    <CheckCircle className="w-6 h-6 mr-3" />
                    ✨ 신청 완료!
                  </>
                ) : (
                  <span className="flex items-center justify-center">
                    🚀 가입 신청하기
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}