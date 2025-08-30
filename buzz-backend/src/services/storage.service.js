const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase 클라이언트 설정
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const STORAGE_BUCKET = 'business-documents';

/**
 * 파일을 Supabase Storage에 업로드
 * @param {Buffer} fileBuffer - 파일 버퍼
 * @param {string} fileName - 저장할 파일명
 * @param {string} contentType - 파일 MIME 타입
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
const uploadFile = async (fileBuffer, fileName, contentType) => {
  try {
    // 고유한 파일명 생성 (타임스탬프 + 랜덤 문자열)
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${timestamp}_${randomStr}.${fileExtension}`;

    console.log(`Uploading file: ${uniqueFileName}, Size: ${fileBuffer.length} bytes`);

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(uniqueFileName, fileBuffer, {
        contentType: contentType,
        upsert: false
      });

    if (error) {
      console.error('Supabase Storage upload error:', error);
      return {
        success: false,
        error: `파일 업로드 실패: ${error.message}`
      };
    }

    // 공개 URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(uniqueFileName);

    console.log(`File uploaded successfully: ${publicUrl}`);

    return {
      success: true,
      data: {
        fileName: uniqueFileName,
        originalName: fileName,
        publicUrl: publicUrl,
        size: fileBuffer.length,
        contentType: contentType
      }
    };

  } catch (error) {
    console.error('Upload service error:', error);
    return {
      success: false,
      error: '파일 업로드 중 서버 오류가 발생했습니다'
    };
  }
};

/**
 * 파일을 Supabase Storage에서 삭제
 * @param {string} fileName - 삭제할 파일명
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const deleteFile = async (fileName) => {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([fileName]);

    if (error) {
      console.error('Supabase Storage delete error:', error);
      return {
        success: false,
        error: `파일 삭제 실패: ${error.message}`
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Delete service error:', error);
    return {
      success: false,
      error: '파일 삭제 중 서버 오류가 발생했습니다'
    };
  }
};

/**
 * Storage 버킷 상태 확인
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const checkBucketHealth = async () => {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      return {
        success: false,
        error: `Storage 연결 실패: ${error.message}`
      };
    }

    const bucketExists = data.some(bucket => bucket.name === STORAGE_BUCKET);
    
    if (!bucketExists) {
      return {
        success: false,
        error: `버킷 '${STORAGE_BUCKET}'이 존재하지 않습니다`
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Storage health check error:', error);
    return {
      success: false,
      error: 'Storage 상태 확인 중 오류가 발생했습니다'
    };
  }
};

/**
 * 파일 타입 검증
 * @param {string} mimetype - 파일 MIME 타입
 * @returns {boolean}
 */
const isValidFileType = (mimetype) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png'
  ];
  return allowedTypes.includes(mimetype);
};

/**
 * 파일 크기 검증 (5MB 제한)
 * @param {number} size - 파일 크기 (bytes)
 * @returns {boolean}
 */
const isValidFileSize = (size) => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  return size <= maxSize;
};

module.exports = {
  uploadFile,
  deleteFile,
  checkBucketHealth,
  isValidFileType,
  isValidFileSize
};