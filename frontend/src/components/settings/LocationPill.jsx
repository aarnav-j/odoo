import { MapPin } from 'lucide-react';

export default function LocationPill({ location, onDelete }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 hover:border-white/20 transition-all group">
      <MapPin className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
      <span className="text-sm font-medium text-slate-200">{location.name}</span>
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Delete ${location.name}?`)) {
              onDelete(location.id);
            }
          }}
          className="ml-1 opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          title="Delete location"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

