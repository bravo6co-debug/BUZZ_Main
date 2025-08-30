import { Button } from '../ui/button'
import { Check, X, Eye } from 'lucide-react'

interface ActionButtonsProps {
  onApprove?: () => void
  onReject?: () => void
  onView?: () => void
  showApprove?: boolean
  showReject?: boolean
  showView?: boolean
}

export function ActionButtons({ 
  onApprove, 
  onReject, 
  onView, 
  showApprove = true, 
  showReject = true, 
  showView = true 
}: ActionButtonsProps) {
  return (
    <div className="flex gap-1">
      {showApprove && onApprove && (
        <Button size="sm" variant="outline" onClick={onApprove}>
          <Check className="w-3 h-3" />
        </Button>
      )}
      {showReject && onReject && (
        <Button size="sm" variant="outline" onClick={onReject}>
          <X className="w-3 h-3" />
        </Button>
      )}
      {showView && onView && (
        <Button size="sm" variant="outline" onClick={onView}>
          <Eye className="w-3 h-3" />
        </Button>
      )}
    </div>
  )
}