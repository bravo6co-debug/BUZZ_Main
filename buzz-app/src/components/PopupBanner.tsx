import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { usePopupBanner } from '../hooks/usePopupBanner';

export default function PopupBanner() {
  const { currentPopup, dismissPopup, trackView } = usePopupBanner();

  useEffect(() => {
    if (currentPopup) {
      trackView(currentPopup.id);
    }
  }, [currentPopup]);

  if (!currentPopup) return null;

  const handleCTAClick = () => {
    if (currentPopup.ctaButton?.link) {
      dismissPopup(currentPopup.id, 'click');
      window.open(currentPopup.ctaButton.link, '_blank');
    }
  };

  const renderPopupContent = () => {
    switch (currentPopup.type) {
      case 'fullscreen':
        return (
          <div className="fixed inset-0 bg-white z-50 flex flex-col">
            <div className="flex justify-end p-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => dismissPopup(currentPopup.id)}
              >
                <X size={24} />
              </Button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              {currentPopup.imageUrl && (
                <img
                  src={currentPopup.imageUrl}
                  alt={currentPopup.title}
                  className="max-w-full max-h-96 mb-6"
                />
              )}
              <h2 className="text-2xl font-bold mb-4">{currentPopup.title}</h2>
              <p className="text-gray-600 mb-6 text-center">{currentPopup.content}</p>
              {currentPopup.ctaButton && (
                <Button onClick={handleCTAClick} size="lg">
                  {currentPopup.ctaButton.text}
                </Button>
              )}
            </div>
          </div>
        );

      case 'center':
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => dismissPopup(currentPopup.id)}
              >
                <X size={20} />
              </Button>
              {currentPopup.imageUrl && (
                <img
                  src={currentPopup.imageUrl}
                  alt={currentPopup.title}
                  className="w-full h-48 object-cover rounded mb-4"
                />
              )}
              <h2 className="text-xl font-bold mb-2">{currentPopup.title}</h2>
              <p className="text-gray-600 mb-4">{currentPopup.content}</p>
              {currentPopup.ctaButton && (
                <Button onClick={handleCTAClick} className="w-full">
                  {currentPopup.ctaButton.text}
                </Button>
              )}
            </div>
          </div>
        );

      case 'bottom':
        return (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 p-4">
            <div className="max-w-lg mx-auto relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0"
                onClick={() => dismissPopup(currentPopup.id)}
              >
                <X size={20} />
              </Button>
              <div className="flex items-center gap-4">
                {currentPopup.imageUrl && (
                  <img
                    src={currentPopup.imageUrl}
                    alt={currentPopup.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold">{currentPopup.title}</h3>
                  <p className="text-sm text-gray-600">{currentPopup.content}</p>
                </div>
                {currentPopup.ctaButton && (
                  <Button onClick={handleCTAClick} size="sm">
                    {currentPopup.ctaButton.text}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );

      case 'top':
        return (
          <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white z-50 p-3">
            <div className="max-w-lg mx-auto flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">{currentPopup.title}</p>
                <p className="text-xs opacity-90">{currentPopup.content}</p>
              </div>
              <div className="flex items-center gap-2">
                {currentPopup.ctaButton && (
                  <Button
                    onClick={handleCTAClick}
                    size="sm"
                    variant="secondary"
                  >
                    {currentPopup.ctaButton.text}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => dismissPopup(currentPopup.id)}
                  className="text-white hover:bg-white/20"
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return renderPopupContent();
}