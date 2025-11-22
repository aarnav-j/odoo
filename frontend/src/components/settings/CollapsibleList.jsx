import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CollapsibleList({ items, renderItem, maxVisible = 3 }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (items.length <= maxVisible) {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <div key={index}>{renderItem(item, index)}</div>
        ))}
      </div>
    );
  }

  const visibleItems = isExpanded ? items : items.slice(0, maxVisible);
  const remainingCount = items.length - maxVisible;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {visibleItems.map((item, index) => (
          <div key={index}>{renderItem(item, index)}</div>
        ))}
      </div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-sm text-slate-400 hover:text-indigo-400 transition-colors mt-1"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        <span>{isExpanded ? 'Show less' : `+ ${remainingCount} more`}</span>
      </button>
    </div>
  );
}

