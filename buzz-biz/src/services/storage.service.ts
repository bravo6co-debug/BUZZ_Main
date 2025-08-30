import { supabase } from '../lib/supabase';

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  url?: string;
  path?: string;
}

class StorageService {
  private readonly MAX_FILE_SIZE = {
    image: 5 * 1024 * 1024, // 5MB
    document: 10 * 1024 * 1024, // 10MB
  };

  private readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  private readonly ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];

  // 프로필 이미지 업로드
  async uploadProfileImage(file: File, userId?: string): Promise<UploadResult> {
    try {
      // 사용자 ID 확인
      let userIdToUse = userId;
      if (!userIdToUse) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        userIdToUse = user.id;
      }

      // 파일 유효성 검사
      const validation = this.validateImageFile(file);
      if (!validation.success) {
        return validation;
      }

      // 기존 프로필 이미지 삭제 (있으면)
      await this.deleteProfileImage(userIdToUse);

      // 파일명 생성
      const fileExt = file.name.split('.').pop();
      const fileName = `${userIdToUse}/profile.${fileExt}`;

      // 업로드
      const { data, error } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // 공개 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      // 프로필 테이블 업데이트
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userIdToUse);

      return {
        success: true,
        url: publicUrl,
        path: data.path
      };
    } catch (error: any) {
      console.error('Profile image upload error:', error);
      return {
        success: false,
        error: error.message || '프로필 이미지 업로드 실패'
      };
    }
  }

  // 프로필 이미지 삭제
  async deleteProfileImage(userId: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from('profile-images')
        .remove([`${userId}/profile.jpg`, `${userId}/profile.png`, `${userId}/profile.jpeg`]);
      
      if (error && error.message !== 'Object not found') {
        console.error('Error deleting profile image:', error);
      }
    } catch (error) {
      console.error('Delete profile image error:', error);
    }
  }

  // 사업자 등록증 업로드
  async uploadBusinessDocument(file: File, businessId: string): Promise<UploadResult> {
    try {
      // 파일 유효성 검사
      const validation = this.validateDocumentFile(file);
      if (!validation.success) {
        return validation;
      }

      // 파일명 생성
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${businessId}/business-license-${timestamp}.${fileExt}`;

      // 업로드
      const { data, error } = await supabase.storage
        .from('business-docs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // URL 가져오기 (비공개 버킷)
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('business-docs')
        .createSignedUrl(fileName, 3600); // 1시간 유효

      if (urlError) throw urlError;

      // 비즈니스 테이블 업데이트
      await supabase
        .from('businesses')
        .update({ 
          business_license_url: fileName,
          verification_status: 'pending'
        })
        .eq('id', businessId);

      return {
        success: true,
        url: signedUrlData.signedUrl,
        path: data.path
      };
    } catch (error: any) {
      console.error('Business document upload error:', error);
      return {
        success: false,
        error: error.message || '사업자 등록증 업로드 실패'
      };
    }
  }

  // 매장 이미지 업로드 (다중)
  async uploadBusinessImages(files: File[], businessId: string): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const file of files) {
      try {
        // 파일 유효성 검사
        const validation = this.validateImageFile(file);
        if (!validation.success) {
          results.push(validation);
          continue;
        }

        // 파일명 생성
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const fileExt = file.name.split('.').pop();
        const fileName = `${businessId}/${timestamp}-${random}.${fileExt}`;

        // 업로드
        const { data, error } = await supabase.storage
          .from('business-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // 공개 URL 가져오기
        const { data: { publicUrl } } = supabase.storage
          .from('business-images')
          .getPublicUrl(fileName);

        // 비즈니스 이미지 테이블에 추가
        await supabase
          .from('business_images')
          .insert({
            business_id: businessId,
            image_url: publicUrl,
            image_path: fileName,
            is_primary: results.length === 0 // 첫 번째 이미지를 대표 이미지로
          });

        results.push({
          success: true,
          url: publicUrl,
          path: data.path
        });
      } catch (error: any) {
        console.error('Business image upload error:', error);
        results.push({
          success: false,
          error: error.message || '매장 이미지 업로드 실패'
        });
      }
    }

    return results;
  }

  // 리뷰 이미지 업로드 (다중)
  async uploadReviewImages(files: File[], reviewId: string): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const file of files) {
      try {
        // 파일 유효성 검사
        const validation = this.validateImageFile(file);
        if (!validation.success) {
          results.push(validation);
          continue;
        }

        // 파일명 생성
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const fileExt = file.name.split('.').pop();
        const fileName = `reviews/${reviewId}/${timestamp}-${random}.${fileExt}`;

        // 업로드
        const { data, error } = await supabase.storage
          .from('review-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // 공개 URL 가져오기
        const { data: { publicUrl } } = supabase.storage
          .from('review-images')
          .getPublicUrl(fileName);

        // 리뷰 이미지 테이블에 추가
        await supabase
          .from('review_images')
          .insert({
            review_id: reviewId,
            image_url: publicUrl,
            image_path: fileName
          });

        results.push({
          success: true,
          url: publicUrl,
          path: data.path
        });
      } catch (error: any) {
        console.error('Review image upload error:', error);
        results.push({
          success: false,
          error: error.message || '리뷰 이미지 업로드 실패'
        });
      }
    }

    return results;
  }

  // 배너 이미지 업로드 (관리자용)
  async uploadBannerImage(file: File, bannerId: string): Promise<UploadResult> {
    try {
      // 파일 유효성 검사
      const validation = this.validateImageFile(file);
      if (!validation.success) {
        return validation;
      }

      // 파일명 생성
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `banners/${bannerId}-${timestamp}.${fileExt}`;

      // 업로드
      const { data, error } = await supabase.storage
        .from('banner-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // 공개 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('banner-images')
        .getPublicUrl(fileName);

      return {
        success: true,
        url: publicUrl,
        path: data.path
      };
    } catch (error: any) {
      console.error('Banner image upload error:', error);
      return {
        success: false,
        error: error.message || '배너 이미지 업로드 실패'
      };
    }
  }

  // 파일 삭제
  async deleteFile(bucket: string, path: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('File deletion error:', error);
      return false;
    }
  }

  // 공개 URL 가져오기
  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }

  // 서명된 URL 가져오기 (비공개 파일용)
  async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Get signed URL error:', error);
      return null;
    }
  }

  // 이미지 파일 유효성 검사
  private validateImageFile(file: File): UploadResult {
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        success: false,
        error: '지원하지 않는 이미지 형식입니다. JPG, PNG, GIF, WebP만 가능합니다.'
      };
    }

    if (file.size > this.MAX_FILE_SIZE.image) {
      return {
        success: false,
        error: '이미지 크기는 5MB를 초과할 수 없습니다.'
      };
    }

    return { success: true };
  }

  // 문서 파일 유효성 검사
  private validateDocumentFile(file: File): UploadResult {
    if (!this.ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      return {
        success: false,
        error: '지원하지 않는 문서 형식입니다. PDF, JPG, PNG만 가능합니다.'
      };
    }

    if (file.size > this.MAX_FILE_SIZE.document) {
      return {
        success: false,
        error: '문서 크기는 10MB를 초과할 수 없습니다.'
      };
    }

    return { success: true };
  }

  // 이미지 압축 (클라이언트 사이드)
  async compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          // 비율 유지하면서 크기 조정
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            file.type,
            quality
          );
        };
      };
      reader.onerror = reject;
    });
  }
}

export const storageService = new StorageService();