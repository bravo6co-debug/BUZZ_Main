import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Gift, 
  Users, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Eye,
  Settings,
  Download,
  AlertCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { adminCouponService, AdminCoupon } from '../services/adminCoupon.service';
import CouponEditModal from './CouponEditModal';
import CouponIssueModal from './CouponIssueModal';
import { LoadingSpinner } from './ui/loading-spinner';
import { toast } from './ui/use-toast';

interface CouponFilters {
  status: '' | 'active' | 'inactive';
  type: '' | 'basic' | 'signup' | 'referral' | 'event';
  search: string;
}

export default function CouponManagement() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CouponFilters>({
    status: '',
    type: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCoupon, setSelectedCoupon] = useState<AdminCoupon | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadCoupons = async (page = 1) => {
    setLoading(true);
    try {
      const response = await adminCouponService.getCoupons({
        page,
        limit: 20,
        status: filters.status || undefined,
        type: filters.type || undefined,
        search: filters.search || undefined,
      });

      if (response.success && response.data) {
        setCoupons(response.data);
        if (response.pagination) {
          setTotalPages(Math.ceil(response.pagination.total / response.pagination.limit));
        }
      } else {
        toast({
          title: '오류',
          description: response.error || '쿠폰 목록을 불러오는데 실패했습니다.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error loading coupons:', error);
      toast({
        title: '오류',
        description: '쿠폰 목록을 불러오는데 실패했습니다.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons(currentPage);
  }, [currentPage, filters]);

  const handleFilterChange = (key: keyof CouponFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleCreateCoupon = () => {
    setSelectedCoupon(null);
    setShowCreateModal(true);
  };

  const handleEditCoupon = (coupon: AdminCoupon) => {
    setSelectedCoupon(coupon);
    setShowEditModal(true);
  };

  const handleIssueCoupon = (coupon: AdminCoupon) => {
    setSelectedCoupon(coupon);
    setShowIssueModal(true);
  };

  const handleDeleteCoupon = async (coupon: AdminCoupon) => {
    if (!window.confirm(`"${coupon.name}" 쿠폰을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await adminCouponService.deleteCoupon(coupon.id, false);
      if (response.success) {
        toast({
          title: '성공',
          description: '쿠폰이 비활성화되었습니다.',
          variant: 'default'
        });
        loadCoupons(currentPage);
      } else {
        toast({
          title: '오류',
          description: response.error || '쿠폰 삭제에 실패했습니다.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast({
        title: '오류',
        description: '쿠폰 삭제에 실패했습니다.',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default' as const,
      inactive: 'secondary' as const,
    };
    const labels = {
      active: '활성',
      inactive: '비활성',
    };
    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      basic: 'bg-blue-100 text-blue-800',
      signup: 'bg-green-100 text-green-800',
      referral: 'bg-purple-100 text-purple-800',
      event: 'bg-orange-100 text-orange-800',
    };
    const labels = {
      basic: '기본',
      signup: '가입',
      referral: '추천',
      event: '이벤트',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type as keyof typeof colors]}`}>
        {labels[type as keyof typeof labels]}
      </span>
    );
  };

  const formatDiscountText = (coupon: AdminCoupon) => {
    if (coupon.discount_type === 'fixed') {
      return `${coupon.discount_value.toLocaleString()}원`;
    } else {
      return `${coupon.discount_value}%`;
    }
  };

  const calculateUsageRate = (coupon: AdminCoupon) => {
    if (!coupon.issued_count) return 0;
    return Math.round(((coupon.used_count || 0) / coupon.issued_count) * 100);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">쿠폰 관리</h1>
          <p className="text-gray-600 mt-1">쿠폰을 생성하고 관리합니다</p>
        </div>
        <Button onClick={handleCreateCoupon} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          쿠폰 생성
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 쿠폰</p>
                <p className="text-2xl font-bold">{coupons.length}</p>
              </div>
              <Gift className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">활성 쿠폰</p>
                <p className="text-2xl font-bold text-green-600">
                  {coupons.filter(c => c.status === 'active').length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 발급량</p>
                <p className="text-2xl font-bold">
                  {coupons.reduce((sum, c) => sum + (c.issued_count || 0), 0).toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">할인 총액</p>
                <p className="text-2xl font-bold">
                  {coupons.reduce((sum, c) => sum + (c.total_discount_amount || 0), 0).toLocaleString()}원
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder="쿠폰명 검색..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-64"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 상태</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 타입</option>
              <option value="basic">기본</option>
              <option value="signup">가입</option>
              <option value="referral">추천</option>
              <option value="event">이벤트</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <CardTitle>쿠폰 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">쿠폰이 없습니다.</p>
              <Button onClick={handleCreateCoupon} className="mt-4">
                첫 번째 쿠폰 생성
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">쿠폰명</th>
                    <th className="text-left py-3 px-4">타입</th>
                    <th className="text-left py-3 px-4">할인</th>
                    <th className="text-left py-3 px-4">상태</th>
                    <th className="text-left py-3 px-4">발급/사용</th>
                    <th className="text-left py-3 px-4">사용률</th>
                    <th className="text-left py-3 px-4">유효기간</th>
                    <th className="text-left py-3 px-4">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{coupon.name}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(coupon.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getTypeBadge(coupon.type)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <span className="font-medium">{formatDiscountText(coupon)}</span>
                          <p className="text-gray-500">
                            {coupon.discount_type === 'fixed' ? '정액' : '정률'}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(coupon.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <p>{(coupon.issued_count || 0).toLocaleString()} / {(coupon.used_count || 0).toLocaleString()}</p>
                          {coupon.total_quantity && (
                            <p className="text-gray-500">
                              총 {coupon.total_quantity.toLocaleString()}개
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${calculateUsageRate(coupon)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {calculateUsageRate(coupon)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {coupon.valid_from && coupon.valid_until ? (
                            <>
                              <p>{new Date(coupon.valid_from).toLocaleDateString()}</p>
                              <p className="text-gray-500">
                                ~ {new Date(coupon.valid_until).toLocaleDateString()}
                              </p>
                            </>
                          ) : (
                            <span className="text-gray-500">제한없음</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCoupon(coupon)}
                            title="편집"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleIssueCoupon(coupon)}
                            title="발급"
                            disabled={coupon.status !== 'active'}
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCoupon(coupon)}
                            title="삭제"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            이전
          </Button>
          <span className="flex items-center px-4">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            다음
          </Button>
        </div>
      )}

      {/* Modals */}
      {(showCreateModal || showEditModal) && (
        <CouponEditModal
          coupon={selectedCoupon}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedCoupon(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedCoupon(null);
            loadCoupons(currentPage);
          }}
        />
      )}

      {showIssueModal && selectedCoupon && (
        <CouponIssueModal
          coupon={selectedCoupon}
          onClose={() => {
            setShowIssueModal(false);
            setSelectedCoupon(null);
          }}
          onIssue={() => {
            setShowIssueModal(false);
            setSelectedCoupon(null);
            loadCoupons(currentPage);
          }}
        />
      )}
    </div>
  );
}