import { useState, useRef } from "react";
import { Upload, X, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { Button } from "./ui/button";

interface UploadedFile {
  file: File;
  preview?: string;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface FileUploadComponentProps {
  label: string;
  description?: string;
  acceptedTypes: string[];
  maxFiles?: number;
  maxSize?: number; // MB
  onFilesChange?: (files: File[]) => void;
  required?: boolean;
}

export default function FileUploadComponent({
  label,
  description,
  acceptedTypes,
  maxFiles = 1,
  maxSize = 5,
  onFilesChange,
  required = false
}: FileUploadComponentProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // 파일 크기 검증
    if (file.size > maxSize * 1024 * 1024) {
      return `파일 크기는 ${maxSize}MB 이하여야 합니다.`;
    }

    // 파일 타입 검증
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const acceptedExtensions = acceptedTypes.map(type => type.split('/')[1]);
    
    if (!fileExtension || !acceptedExtensions.includes(fileExtension)) {
      return `지원하지 않는 파일 형식입니다. (${acceptedTypes.join(', ')})`;
    }

    return null;
  };

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (uploadedFiles.length + fileArray.length > maxFiles) {
      alert(`최대 ${maxFiles}개의 파일만 업로드할 수 있습니다.`);
      return;
    }

    const newFiles: UploadedFile[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      
      if (error) {
        newFiles.push({
          file,
          status: 'error',
          error
        });
        continue;
      }

      // 이미지 파일인 경우 미리보기 생성
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        try {
          preview = await createImagePreview(file);
        } catch (e) {
          console.error('미리보기 생성 실패:', e);
        }
      }

      newFiles.push({
        file,
        preview,
        status: 'success'
      });
    }

    const updatedFiles = [...uploadedFiles, ...newFiles];
    setUploadedFiles(updatedFiles);

    // 성공적으로 업로드된 파일들만 부모 컴포넌트에 전달
    const successfulFiles = updatedFiles
      .filter(f => f.status === 'success')
      .map(f => f.file);
    onFilesChange?.(successfulFiles);
  };

  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updatedFiles);
    
    const successfulFiles = updatedFiles
      .filter(f => f.status === 'success')
      .map(f => f.file);
    onFilesChange?.(successfulFiles);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'doc':
      case 'docx':
        return '📝';
      default:
        return '📎';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {description && (
          <p className="text-sm text-gray-500 mb-4">{description}</p>
        )}
      </div>

      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <Upload size={48} className="mx-auto text-gray-400" />
          <div>
            <p className="text-sm text-gray-600">
              파일을 드래그하여 놓거나{' '}
              <button
                type="button"
                className="text-blue-600 hover:text-blue-500 underline"
                onClick={() => fileInputRef.current?.click()}
              >
                클릭하여 선택
              </button>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {acceptedTypes.join(', ')} 파일만 가능 (최대 {maxSize}MB, {maxFiles}개)
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">업로드된 파일</h4>
          {uploadedFiles.map((fileData, index) => (
            <div
              key={index}
              className={`flex items-center p-3 rounded-lg border ${
                fileData.status === 'error'
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              {/* File Preview/Icon */}
              <div className="flex-shrink-0 mr-3">
                {fileData.preview ? (
                  <img
                    src={fileData.preview}
                    alt="미리보기"
                    className="w-12 h-12 object-cover rounded border"
                  />
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center bg-white rounded border">
                    <span className="text-2xl">
                      {getFileIcon(fileData.file.name)}
                    </span>
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {fileData.file.name}
                </p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(fileData.file.size)}
                </p>
                {fileData.error && (
                  <p className="text-sm text-red-600 mt-1">{fileData.error}</p>
                )}
              </div>

              {/* Status Icon */}
              <div className="flex-shrink-0 ml-3">
                {fileData.status === 'success' && (
                  <CheckCircle size={20} className="text-green-500" />
                )}
                {fileData.status === 'error' && (
                  <AlertCircle size={20} className="text-red-500" />
                )}
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="flex-shrink-0 ml-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Summary */}
      {uploadedFiles.length > 0 && (
        <div className="text-sm text-gray-600">
          {uploadedFiles.filter(f => f.status === 'success').length}/{maxFiles} 파일 업로드 완료
        </div>
      )}
    </div>
  );
}