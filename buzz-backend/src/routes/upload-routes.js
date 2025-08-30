const express = require('express');
const multer = require('multer');
const { uploadFile, isValidFileType, isValidFileSize } = require('../services/storage.service');
const { authenticateToken } = require('../auth-demo');
require('dotenv').config();

const router = express.Router();

// Multer 설정 (메모리 저장소 사용)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
    files: 3 // 최대 3개 파일
  },
  fileFilter: (req, file, cb) => {
    console.log(`Uploading file: ${file.originalname}, Type: ${file.mimetype}`);
    
    // 파일 타입 검증
    if (!isValidFileType(file.mimetype)) {
      return cb(new Error('지원하지 않는 파일 형식입니다. PDF, JPG, PNG 파일만 업로드 가능합니다.'));
    }
    
    cb(null, true);
  }
});

/**
 * 비즈니스 서류 업로드
 * POST /api/upload/business-documents
 */
router.post('/business-documents', upload.array('documents', 3), async (req, res) => {
  try {
    console.log('Files received:', req.files?.length || 0);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_001',
          message: '업로드할 파일이 없습니다'
        }
      });
    }

    const uploadResults = [];
    const errors = [];

    // 각 파일을 Supabase Storage에 업로드
    for (const file of req.files) {
      // 파일 크기 재검증
      if (!isValidFileSize(file.size)) {
        errors.push({
          fileName: file.originalname,
          error: '파일 크기는 5MB 이하여야 합니다'
        });
        continue;
      }

      // Supabase Storage에 업로드
      const uploadResult = await uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      if (uploadResult.success) {
        uploadResults.push({
          originalName: file.originalname,
          fileName: uploadResult.data.fileName,
          publicUrl: uploadResult.data.publicUrl,
          size: uploadResult.data.size,
          contentType: uploadResult.data.contentType
        });
      } else {
        errors.push({
          fileName: file.originalname,
          error: uploadResult.error
        });
      }
    }

    // 결과 반환
    if (uploadResults.length === 0) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_002',
          message: '모든 파일 업로드에 실패했습니다',
          details: errors
        }
      });
    }

    const response = {
      success: true,
      data: {
        uploadedFiles: uploadResults,
        totalUploaded: uploadResults.length,
        totalFiles: req.files.length,
        message: `${uploadResults.length}개 파일이 성공적으로 업로드되었습니다`
      }
    };

    // 일부 파일만 성공한 경우 에러 정보도 포함
    if (errors.length > 0) {
      response.data.errors = errors;
      response.data.message += ` (${errors.length}개 파일 실패)`;
    }

    res.json(response);

  } catch (error) {
    console.error('Upload route error:', error);

    // Multer 에러 처리
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_003',
          message: '파일 크기가 5MB를 초과했습니다'
        }
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_004',
          message: '최대 3개의 파일만 업로드할 수 있습니다'
        }
      });
    }

    if (error.message.includes('지원하지 않는 파일 형식')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_005',
          message: error.message
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_001',
        message: '파일 업로드 중 서버 오류가 발생했습니다',
        details: error.message
      }
    });
  }
});

/**
 * 파일 업로드 테스트 (개발용)
 * POST /api/upload/test
 */
router.post('/test', upload.single('testFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '테스트 파일이 없습니다'
      });
    }

    const uploadResult = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.json({
      success: uploadResult.success,
      data: uploadResult.success ? uploadResult.data : null,
      error: uploadResult.error || null
    });

  } catch (error) {
    console.error('Test upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Storage 상태 확인
 * GET /api/upload/health
 */
router.get('/health', async (req, res) => {
  try {
    const { checkBucketHealth } = require('../services/storage.service');
    const healthCheck = await checkBucketHealth();

    res.json({
      success: healthCheck.success,
      storage: healthCheck.success ? 'connected' : 'disconnected',
      error: healthCheck.error || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Storage health check error:', error);
    res.status(500).json({
      success: false,
      storage: 'error',
      error: error.message
    });
  }
});

module.exports = router;