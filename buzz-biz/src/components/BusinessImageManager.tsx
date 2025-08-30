import { useState, useEffect } from 'react';
import { Image, Upload, X, Star, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import FileUpload from './FileUpload';
import { storageService } from '../services/storage.service';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface BusinessImage {
  id: string;
  image_url: string;
  image_path: string;
  is_primary: boolean;
  created_at: string;
}

interface BusinessImageManagerProps {
  businessId: string;
  maxImages?: number;
}

export default function BusinessImageManager({ 
  businessId, 
  maxImages = 10 
}: BusinessImageManagerProps) {
  const [images, setImages] = useState<BusinessImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<BusinessImage | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadBusinessImages();
  }, [businessId]);

  const loadBusinessImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_images')
        .select('*')
        .eq('business_id', businessId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error loading business images:', error);
      toast.error('이미지를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (files: File[]) => {
    if (images.length + files.length > maxImages) {
      toast.error(`최대 ${maxImages}개의 이미지만 업로드할 수 있습니다`);
      return;
    }

    setUploading(true);
    try {
      const results = await storageService.uploadBusinessImages(files, businessId);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        toast.success(`${successCount}개의 이미지가 업로드되었습니다`);
        await loadBusinessImages(); // 이미지 목록 새로고침
        setShowUploadModal(false);
      }
      
      if (failCount > 0) {
        toast.error(`${failCount}개의 이미지 업로드에 실패했습니다`);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('이미지 업로드 중 오류가 발생했습니다');
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      // 모든 이미지의 is_primary를 false로 설정
      await supabase
        .from('business_images')
        .update({ is_primary: false })
        .eq('business_id', businessId);

      // 선택한 이미지를 primary로 설정
      const { error } = await supabase
        .from('business_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      if (error) throw error;

      toast.success('대표 이미지가 변경되었습니다');
      await loadBusinessImages();
    } catch (error) {
      console.error('Error setting primary image:', error);
      toast.error('대표 이미지 설정에 실패했습니다');
    }
  };

  const handleDeleteImage = async (image: BusinessImage) => {
    if (!confirm('이 이미지를 삭제하시겠습니까?')) return;

    try {
      // Storage에서 파일 삭제
      await storageService.deleteFile('business-images', image.image_path);

      // DB에서 레코드 삭제
      const { error } = await supabase
        .from('business_images')
        .delete()
        .eq('id', image.id);

      if (error) throw error;

      toast.success('이미지가 삭제되었습니다');
      await loadBusinessImages();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('이미지 삭제에 실패했습니다');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Image size={20} />
            매장 이미지 관리
          </span>
          <Button
            size="sm"
            onClick={() => setShowUploadModal(true)}
            disabled={images.length >= maxImages}
          >
            <Upload size={16} className="mr-2" />
            이미지 추가
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <div className="text-center py-12">
            <Image size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">등록된 매장 이미지가 없습니다</p>
            <Button onClick={() => setShowUploadModal(true)}>
              첫 이미지 업로드하기
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative group rounded-lg overflow-hidden border"
              >
                <img
                  src={image.image_url}
                  alt="매장 이미지"
                  className="w-full h-40 object-cover cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                />
                
                {image.is_primary && (
                  <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    <Star size={12} fill="white" />
                    대표
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!image.is_primary && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetPrimary(image.id);
                      }}
                    >
                      <Star size={14} className="mr-1" />
                      대표 설정
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(image);
                    }}
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-sm text-gray-500">
          {images.length} / {maxImages} 이미지 사용 중
        </div>
      </CardContent>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>매장 이미지 업로드</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <FileUpload
              onUpload={handleImageUpload}
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              multiple={true}
              maxFiles={maxImages - images.length}
              maxSize={5}
              fileType="image"
              preview={true}
              disabled={uploading}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>이미지 미리보기</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <img
                src={selectedImage.image_url}
                alt="매장 이미지"
                className="w-full h-auto rounded-lg"
              />
              {selectedImage.is_primary && (
                <div className="absolute top-4 left-4 bg-yellow-500 text-white px-3 py-2 rounded flex items-center gap-2">
                  <Star size={16} fill="white" />
                  대표 이미지
                </div>
              )}
            </div>
            <div className="flex justify-between mt-4">
              <div className="text-sm text-gray-500">
                업로드: {new Date(selectedImage.created_at).toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                {!selectedImage.is_primary && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleSetPrimary(selectedImage.id);
                      setSelectedImage(null);
                    }}
                  >
                    <Star size={16} className="mr-2" />
                    대표 이미지로 설정
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDeleteImage(selectedImage);
                    setSelectedImage(null);
                  }}
                >
                  <X size={16} className="mr-2" />
                  삭제
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}