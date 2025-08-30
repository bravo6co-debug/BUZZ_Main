import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { toast } from 'sonner';

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  onRemove?: (index: number) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in MB
  fileType?: 'image' | 'document' | 'any';
  className?: string;
  disabled?: boolean;
  preview?: boolean;
  compact?: boolean;
}

interface UploadedFile {
  file: File;
  preview?: string;
  progress?: number;
  error?: string;
}

export default function FileUpload({
  onUpload,
  onRemove,
  accept = '*',
  multiple = false,
  maxFiles = 5,
  maxSize = 5, // 5MB default
  fileType = 'any',
  className = '',
  disabled = false,
  preview = true,
  compact = false
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File type configurations
  const fileTypeConfig = {
    image: {
      accept: 'image/jpeg,image/jpg,image/png,image/gif,image/webp',
      icon: Image,
      text: '이미지'
    },
    document: {
      accept: 'application/pdf,image/jpeg,image/jpg,image/png',
      icon: FileText,
      text: '문서'
    },
    any: {
      accept: '*',
      icon: Upload,
      text: '파일'
    }
  };

  const config = fileTypeConfig[fileType];
  const acceptTypes = accept === '*' ? config.accept : accept;

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop event
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled || uploading) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFiles(droppedFiles);
    },
    [disabled, uploading]
  );

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  // Process selected files
  const handleFiles = async (selectedFiles: File[]) => {
    // Validate file count
    if (!multiple && selectedFiles.length > 1) {
      toast.error('한 개의 파일만 선택할 수 있습니다');
      return;
    }

    if (files.length + selectedFiles.length > maxFiles) {
      toast.error(`최대 ${maxFiles}개의 파일만 업로드할 수 있습니다`);
      return;
    }

    // Validate and prepare files
    const validFiles: UploadedFile[] = [];
    
    for (const file of selectedFiles) {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`${file.name}: 파일 크기는 ${maxSize}MB를 초과할 수 없습니다`);
        continue;
      }

      // Check file type
      if (fileType === 'image' && !file.type.startsWith('image/')) {
        toast.error(`${file.name}: 이미지 파일만 업로드 가능합니다`);
        continue;
      }

      const uploadedFile: UploadedFile = { file };

      // Create preview for images
      if (preview && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          uploadedFile.preview = e.target?.result as string;
          setFiles(prev => [...prev]);
        };
        reader.readAsDataURL(file);
      }

      validFiles.push(uploadedFile);
    }

    if (validFiles.length === 0) return;

    // Add files to state
    setFiles(prev => [...prev, ...validFiles]);

    // Upload files
    if (onUpload && validFiles.length > 0) {
      setUploading(true);
      try {
        await onUpload(validFiles.map(f => f.file));
        toast.success('파일 업로드 완료');
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('파일 업로드 실패');
      } finally {
        setUploading(false);
      }
    }
  };

  // Remove file
  const handleRemove = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (onRemove) {
      onRemove(index);
    }
  };

  // Trigger file input
  const triggerFileInput = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const IconComponent = config.icon;

  if (compact) {
    return (
      <div className={className}>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={triggerFileInput}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {uploading ? '업로드 중...' : `${config.text} 선택`}
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Drop zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center
          ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${files.length > 0 ? 'mb-4' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        {uploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-gray-400 animate-spin mb-3" />
            <p className="text-sm text-gray-600">업로드 중...</p>
          </div>
        ) : (
          <>
            <IconComponent className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-2">
              {dragActive
                ? '파일을 놓으세요'
                : `${config.text}을 드래그하거나 클릭하여 선택하세요`}
            </p>
            <p className="text-xs text-gray-500">
              {fileType === 'image' && 'JPG, PNG, GIF, WebP'}
              {fileType === 'document' && 'PDF, JPG, PNG'}
              {fileType === 'any' && '모든 파일 형식'}
              {` • 최대 ${maxSize}MB`}
              {multiple && ` • 최대 ${maxFiles}개`}
            </p>
          </>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((uploadedFile, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              {/* Preview */}
              {preview && uploadedFile.preview ? (
                <img
                  src={uploadedFile.preview}
                  alt={uploadedFile.file.name}
                  className="w-12 h-12 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                  <FileText className="w-6 h-6 text-gray-500" />
                </div>
              )}

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {uploadedFile.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(uploadedFile.file.size)}
                </p>
                {uploadedFile.progress !== undefined && (
                  <Progress value={uploadedFile.progress} className="h-1 mt-1" />
                )}
                {uploadedFile.error && (
                  <p className="text-xs text-red-500 mt-1">{uploadedFile.error}</p>
                )}
              </div>

              {/* Remove button */}
              {!uploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}