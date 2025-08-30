import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Search, Filter } from 'lucide-react'

interface SearchAndFilterProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  placeholder?: string
  onFilter?: () => void
  showFilter?: boolean
}

export function SearchAndFilter({ 
  searchTerm, 
  onSearchChange, 
  placeholder = "검색...", 
  onFilter,
  showFilter = true 
}: SearchAndFilterProps) {
  return (
    <div className="flex gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      {showFilter && onFilter && (
        <Button variant="outline" onClick={onFilter}>
          <Filter className="w-4 h-4 mr-2" />
          필터
        </Button>
      )}
    </div>
  )
}