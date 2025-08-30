import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  Upload,
  Shield,
  Loader2,
  Info
} from 'lucide-react';
import { businessService, BusinessInfo } from '../services/business.service';

export function ApprovalStatus() {
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async () => {
    setLoading(true);
    const data = await businessService.getCurrentBusiness();
    setBusiness(data);
    setLoading(false);
  };

  const handleSubmitForApproval = async () => {
    if (!business) return;
    
    setSubmitting(true);
    
    // 승인 요청 제출
    const result = await businessService.submitForApproval(business.id);
    
    if (result.success) {
      alert('승인 요청이 제출되었습니다. 영업일 기준 1-2일 내에 검토 결과를 알려드립니다.');
      await loadBusinessData();
    } else {
      alert(`승인 요청 실패: ${result.error}`);
    }
    
    setSubmitting(false);
  };

  const getStatusInfo = () => {
    if (!business) return null;
    
    switch (business.verification_status) {
      case 'approved':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          title: '승인 완료',
          description: '비즈니스 계정이 승인되었습니다',
          showAction: false
        };
      case 'pending':
        return {
          icon: Clock,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          title: '승인 대기 중',
          description: '관리자가 검토 중입니다 (1-2일 소요)',
          showAction: false
        };
      case 'rejected':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          title: '승인 거부',
          description: business.rejection_reason || '승인이 거부되었습니다. 정보를 수정 후 다시 신청해주세요.',
          showAction: true
        };
      default:
        return {
          icon: Info,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          title: '미승인 상태',
          description: '비즈니스 승인을 받으면 모든 기능을 사용할 수 있습니다',
          showAction: true
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusInfo = getStatusInfo();
  if (!statusInfo) return null;

  const StatusIcon = statusInfo.icon;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">비즈니스 인증</h3>
      </div>

      {/* Status Display */}
      <div className={`p-4 rounded-lg ${statusInfo.bgColor}`}>
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-6 h-6 ${statusInfo.color}`} />
          <div className="flex-1">
            <h4 className={`font-semibold ${statusInfo.color}`}>
              {statusInfo.title}
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              {statusInfo.description}
            </p>
          </div>
        </div>
      </div>

      {/* Required Documents */}
      {statusInfo.showAction && (
        <>
          <div className="space-y-3">
            <h4 className="font-medium text-sm">필요 서류</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>사업자등록증</span>
                {business?.documents?.business_license && (
                  <Badge variant="default" className="text-xs">제출완료</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>영업신고증 (해당 업종)</span>
                {business?.documents?.operation_permit && (
                  <Badge variant="default" className="text-xs">제출완료</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>통장 사본 (정산용)</span>
                {business?.documents?.bank_account && (
                  <Badge variant="default" className="text-xs">제출완료</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Upload Documents Button */}
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => alert('문서 업로드 기능은 준비 중입니다')}
          >
            <Upload className="w-4 h-4 mr-2" />
            서류 업로드
          </Button>

          {/* Submit for Approval */}
          <Button 
            className="w-full"
            onClick={handleSubmitForApproval}
            disabled={submitting || !business?.documents?.business_license}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                제출 중...
              </>
            ) : (
              '승인 요청하기'
            )}
          </Button>
        </>
      )}

      {/* Approval Benefits */}
      <div className="pt-4 border-t">
        <h4 className="font-medium text-sm mb-3">승인 시 혜택</h4>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
            <span>QR 코드 결제 및 마일리지 적립 기능</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
            <span>실시간 매출 통계 및 고객 분석</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
            <span>일일 정산 자동화 시스템</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
            <span>프리미엄 고객 지원</span>
          </div>
        </div>
      </div>

      {/* Notice */}
      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs text-muted-foreground text-center">
          승인 절차는 영업일 기준 1-2일이 소요됩니다
        </p>
      </div>
    </Card>
  );
}