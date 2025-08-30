import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env['SUPABASE_URL'] || '';
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface UploadedImage {
  url: string;
  thumbnailUrl: string;
  originalName: string;
  size: number;
  mimeType: string;
  width: number;
  height: number;
}

/**
 * 리뷰 이미지를 Supabase Storage에 업로드
 */
export const uploadReviewImages = async (files: Express.Multer.File[]): Promise<UploadedImage[]> => {
  const uploadPromises = files.map(async (file) => {
    return await uploadSingleReviewImage(file);
  });

  const results = await Promise.all(uploadPromises);
  return results;
};

/**
 * 단일 이미지 업로드 처리
 */
const uploadSingleReviewImage = async (file: Express.Multer.File): Promise<UploadedImage> => {
  try {
    // 이미지 메타데이터 추출
    const metadata = await sharp(file.buffer).metadata();
    const { width, height } = metadata;

    // 원본 이미지 최적화 (최대 1200px, 80% 품질)
    const optimizedImageBuffer = await sharp(file.buffer)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    // 썸네일 생성 (300px x 300px)
    const thumbnailBuffer = await sharp(file.buffer)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 70 })
      .toBuffer();

    // 파일명 생성
    const fileExtension = 'jpg'; // 모든 이미지를 JPG로 변환
    const fileName = `review-${uuidv4()}.${fileExtension}`;
    const thumbnailName = `review-thumb-${uuidv4()}.${fileExtension}`;

    // Supabase Storage에 원본 이미지 업로드
    const { data: imageData, error: imageError } = await supabase.storage
      .from('review-images')
      .upload(fileName, optimizedImageBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (imageError) {
      throw new Error(`원본 이미지 업로드 실패: ${imageError.message}`);
    }

    // Supabase Storage에 썸네일 업로드
    const { data: thumbnailData, error: thumbnailError } = await supabase.storage
      .from('review-images')
      .upload(`thumbnails/${thumbnailName}`, thumbnailBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (thumbnailError) {
      throw new Error(`썸네일 업로드 실패: ${thumbnailError.message}`);
    }

    // 공개 URL 생성
    const { data: imageUrl } = supabase.storage
      .from('review-images')
      .getPublicUrl(fileName);

    const { data: thumbnailUrl } = supabase.storage
      .from('review-images')
      .getPublicUrl(`thumbnails/${thumbnailName}`);

    return {
      url: imageUrl.publicUrl,
      thumbnailUrl: thumbnailUrl.publicUrl,
      originalName: file.originalname,
      size: optimizedImageBuffer.length,
      mimeType: 'image/jpeg',
      width: width || 0,
      height: height || 0
    };

  } catch (error) {
    console.error('Image upload error:', error);
    throw new Error(`이미지 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

/**
 * 이미지 삭제 (리뷰 삭제 시 사용)
 */
export const deleteReviewImages = async (imageUrls: string[]): Promise<void> => {
  try {
    const deletePromises = imageUrls.map(async (url) => {
      // URL에서 파일명 추출
      const fileName = url.split('/').pop();
      if (!fileName) return;

      // 원본 이미지 삭제
      const { error: imageError } = await supabase.storage
        .from('review-images')
        .remove([fileName]);

      if (imageError) {
        console.error(`이미지 삭제 실패: ${fileName}`, imageError);
      }

      // 썸네일 삭제
      const thumbnailName = fileName.replace('review-', 'review-thumb-');
      const { error: thumbnailError } = await supabase.storage
        .from('review-images')
        .remove([`thumbnails/${thumbnailName}`]);

      if (thumbnailError) {
        console.error(`썸네일 삭제 실패: ${thumbnailName}`, thumbnailError);
      }
    });

    await Promise.all(deletePromises);

  } catch (error) {
    console.error('Delete images error:', error);
    // 삭제 실패해도 전체 프로세스를 중단하지 않음
  }
};

/**
 * 프로필 이미지 업로드 (사용자 프로필용)
 */
export const uploadProfileImage = async (file: Express.Multer.File, userId: string): Promise<string> => {
  try {
    // 이미지 최적화 (500px x 500px)
    const optimizedImageBuffer = await sharp(file.buffer)
      .resize(500, 500, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    const fileName = `profile-${userId}-${uuidv4()}.jpg`;

    // 기존 프로필 이미지 삭제 (있다면)
    const existingFiles = await supabase.storage
      .from('profile-images')
      .list('', {
        search: `profile-${userId}`
      });

    if (existingFiles.data && existingFiles.data.length > 0) {
      const filesToDelete = existingFiles.data.map(file => file.name);
      await supabase.storage
        .from('profile-images')
        .remove(filesToDelete);
    }

    // 새 이미지 업로드
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(fileName, optimizedImageBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      throw new Error(`프로필 이미지 업로드 실패: ${error.message}`);
    }

    // 공개 URL 반환
    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;

  } catch (error) {
    console.error('Profile image upload error:', error);
    throw new Error(`프로필 이미지 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
};

/**
 * 사업자 이미지 업로드 (매장 사진용)
 */
export const uploadBusinessImages = async (files: Express.Multer.File[], businessId: string): Promise<string[]> => {
  const uploadPromises = files.map(async (file) => {
    // 이미지 최적화 (1200px 최대)
    const optimizedImageBuffer = await sharp(file.buffer)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    const fileName = `business-${businessId}-${uuidv4()}.jpg`;

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from('business-images')
      .upload(fileName, optimizedImageBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) {
      throw new Error(`매장 이미지 업로드 실패: ${error.message}`);
    }

    // 공개 URL 반환
    const { data: urlData } = supabase.storage
      .from('business-images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  });

  return await Promise.all(uploadPromises);
};

/**
 * 이미지 URL에서 파일 정보 추출
 */
export const getImageInfoFromUrl = (url: string) => {
  const urlParts = url.split('/');
  const fileName = urlParts.pop();
  const bucket = urlParts[urlParts.length - 2];
  
  return { fileName, bucket };
};

/**
 * Storage 버킷 초기화 (앱 시작 시 실행)
 */
export const initializeStorage = async (): Promise<void> => {
  try {
    // 필요한 버킷들이 존재하는지 확인하고 생성
    const buckets = ['review-images', 'profile-images', 'business-images'];
    
    for (const bucketName of buckets) {
      const { data: existingBucket } = await supabase.storage.getBucket(bucketName);
      
      if (!existingBucket) {
        const { error } = await supabase.storage.createBucket(bucketName, {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        });
        
        if (error) {
          console.error(`버킷 생성 실패: ${bucketName}`, error);
        } else {
          console.log(`버킷 생성 성공: ${bucketName}`);
        }
      }
    }

  } catch (error) {
    console.error('Storage 초기화 실패:', error);
  }
};