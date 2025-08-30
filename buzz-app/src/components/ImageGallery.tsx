import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';

interface ImageGalleryProps {
  images: string[];
  thumbnailSize?: 'sm' | 'md' | 'lg';
  showThumbnails?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  className?: string;
  onImageClick?: (index: number) => void;
}

export default function ImageGallery({
  images,
  thumbnailSize = 'md',
  showThumbnails = true,
  autoPlay = false,
  autoPlayInterval = 3000,
  className = '',
  onImageClick
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [zoom, setZoom] = useState(1);

  if (!images || images.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-100 rounded-lg ${className}`}>
        <p className="text-gray-500">이미지가 없습니다</p>
      </div>
    );
  }

  const thumbnailSizes = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24'
  };

  const handlePrevious = () => {
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
    onImageClick?.(index);
  };

  const handleMainImageClick = () => {
    setShowLightbox(true);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.5, 0.5));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = images[currentIndex];
    link.download = `image-${currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className={className}>
        {/* Main Image */}
        <div className="relative group">
          <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={images[currentIndex]}
              alt={`Image ${currentIndex + 1}`}
              className="w-full h-full object-cover cursor-pointer"
              onClick={handleMainImageClick}
            />
          </div>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handlePrevious}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleNext}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          {/* Image Counter */}
          <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        </div>

        {/* Thumbnails */}
        {showThumbnails && images.length > 1 && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {images.map((image, index) => (
              <button
                key={index}
                className={`${thumbnailSizes[thumbnailSize]} flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? 'border-primary ring-2 ring-primary/50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleThumbnailClick(index)}
              >
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={showLightbox} onOpenChange={setShowLightbox}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
          <div className="relative bg-black">
            {/* Toolbar */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 flex justify-between items-center z-10">
              <div className="text-white">
                {currentIndex + 1} / {images.length}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={handleZoomOut}
                >
                  <ZoomOut size={18} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={handleZoomIn}
                >
                  <ZoomIn size={18} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={handleDownload}
                >
                  <Download size={18} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => setShowLightbox(false)}
                >
                  <X size={18} />
                </Button>
              </div>
            </div>

            {/* Lightbox Image */}
            <div className="flex items-center justify-center min-h-[60vh] max-h-[85vh] overflow-auto">
              <img
                src={images[currentIndex]}
                alt={`Image ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain"
                style={{ transform: `scale(${zoom})` }}
              />
            </div>

            {/* Lightbox Navigation */}
            {images.length > 1 && (
              <>
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors"
                  onClick={handlePrevious}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors"
                  onClick={handleNext}
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {/* Lightbox Thumbnails */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <div className="flex gap-2 justify-center overflow-x-auto">
                {images.map((image, index) => (
                  <button
                    key={index}
                    className={`w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                      index === currentIndex
                        ? 'border-white ring-2 ring-white/50'
                        : 'border-white/30 hover:border-white/60'
                    }`}
                    onClick={() => setCurrentIndex(index)}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}