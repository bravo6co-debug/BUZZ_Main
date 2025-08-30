import Joi from 'joi';

export interface ReviewValidationResult {
  isValid: boolean;
  errors?: string[];
}

// 리뷰 작성 입력값 검증
export const reviewCreateSchema = Joi.object({
  business_id: Joi.string().uuid().required().messages({
    'string.guid': '올바른 사업자 ID 형식이 아닙니다.',
    'any.required': '사업자 ID는 필수입니다.'
  }),
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.base': '평점은 숫자여야 합니다.',
    'number.integer': '평점은 정수여야 합니다.',
    'number.min': '평점은 최소 1점입니다.',
    'number.max': '평점은 최대 5점입니다.',
    'any.required': '평점은 필수입니다.'
  }),
  content: Joi.string().max(1000).allow('', null).messages({
    'string.max': '리뷰 내용은 최대 1000자까지 입력 가능합니다.'
  }),
  visit_purpose: Joi.string().max(100).allow('', null).messages({
    'string.max': '방문 목적은 최대 100자까지 입력 가능합니다.'
  }),
  tags: Joi.array().items(Joi.string().max(50)).max(10).allow(null).messages({
    'array.max': '태그는 최대 10개까지 설정 가능합니다.',
    'string.max': '각 태그는 최대 50자까지 입력 가능합니다.'
  }),
  visit_count: Joi.number().integer().min(1).max(100).default(1).messages({
    'number.base': '방문 횟수는 숫자여야 합니다.',
    'number.integer': '방문 횟수는 정수여야 합니다.',
    'number.min': '방문 횟수는 최소 1회입니다.',
    'number.max': '방문 횟수는 최대 100회까지 입력 가능합니다.'
  })
});

// 리뷰 수정 입력값 검증
export const reviewUpdateSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).messages({
    'number.base': '평점은 숫자여야 합니다.',
    'number.integer': '평점은 정수여야 합니다.',
    'number.min': '평점은 최소 1점입니다.',
    'number.max': '평점은 최대 5점입니다.'
  }),
  content: Joi.string().max(1000).allow('', null).messages({
    'string.max': '리뷰 내용은 최대 1000자까지 입력 가능합니다.'
  }),
  visit_purpose: Joi.string().max(100).allow('', null).messages({
    'string.max': '방문 목적은 최대 100자까지 입력 가능합니다.'
  }),
  tags: Joi.array().items(Joi.string().max(50)).max(10).allow(null).messages({
    'array.max': '태그는 최대 10개까지 설정 가능합니다.',
    'string.max': '각 태그는 최대 50자까지 입력 가능합니다.'
  }),
  visit_count: Joi.number().integer().min(1).max(100).messages({
    'number.base': '방문 횟수는 숫자여야 합니다.',
    'number.integer': '방문 횟수는 정수여야 합니다.',
    'number.min': '방문 횟수는 최소 1회입니다.',
    'number.max': '방문 횟수는 최대 100회까지 입력 가능합니다.'
  })
}).min(1).messages({
  'object.min': '수정할 내용이 없습니다.'
});

// 리뷰 신고 입력값 검증
export const reviewReportSchema = Joi.object({
  reason: Joi.string().valid(
    'inappropriate_content',
    'fake_review',
    'spam',
    'offensive_language',
    'irrelevant_content',
    'privacy_violation',
    'other'
  ).required().messages({
    'any.only': '올바른 신고 사유를 선택해주세요.',
    'any.required': '신고 사유는 필수입니다.'
  }),
  description: Joi.string().max(500).allow('', null).messages({
    'string.max': '신고 내용은 최대 500자까지 입력 가능합니다.'
  })
});

// 도움됨 평가 입력값 검증
export const reviewHelpfulnessSchema = Joi.object({
  is_helpful: Joi.boolean().required().messages({
    'boolean.base': '도움됨 여부는 true/false 값이어야 합니다.',
    'any.required': '도움됨 여부는 필수입니다.'
  })
});

// 관리자 리뷰 상태 변경 검증
export const reviewStatusSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected', 'hidden').required().messages({
    'any.only': '올바른 리뷰 상태를 선택해주세요.',
    'any.required': '리뷰 상태는 필수입니다.'
  }),
  review_notes: Joi.string().max(500).allow('', null).messages({
    'string.max': '검토 메모는 최대 500자까지 입력 가능합니다.'
  })
});

// 검증 함수들
export const validateReviewInput = (data: any): ReviewValidationResult => {
  const { error } = reviewCreateSchema.validate(data, { abortEarly: false });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  return { isValid: true };
};

export const validateReviewUpdate = (data: any): ReviewValidationResult => {
  const { error } = reviewUpdateSchema.validate(data, { abortEarly: false });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  return { isValid: true };
};

export const validateReviewReport = (data: any): ReviewValidationResult => {
  const { error } = reviewReportSchema.validate(data, { abortEarly: false });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  return { isValid: true };
};

export const validateReviewHelpfulness = (data: any): ReviewValidationResult => {
  const { error } = reviewHelpfulnessSchema.validate(data, { abortEarly: false });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  return { isValid: true };
};

export const validateReviewStatus = (data: any): ReviewValidationResult => {
  const { error } = reviewStatusSchema.validate(data, { abortEarly: false });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  return { isValid: true };
};

// 이미지 파일 검증
export const validateReviewImages = (files: Express.Multer.File[]): ReviewValidationResult => {
  if (!files || files.length === 0) {
    return { isValid: true };
  }

  if (files.length > 3) {
    return {
      isValid: false,
      errors: ['이미지는 최대 3장까지 업로드 가능합니다.']
    };
  }

  const maxFileSize = 5 * 1024 * 1024; // 5MB
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const errors: string[] = [];

  files.forEach((file, index) => {
    if (file.size > maxFileSize) {
      errors.push(`이미지 ${index + 1}: 파일 크기는 5MB 이하여야 합니다.`);
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`이미지 ${index + 1}: JPG, PNG, WebP 형식만 업로드 가능합니다.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
};