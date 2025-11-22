import { Warehouse as WarehouseIcon, Trash2, MapPin } from 'lucide-react';

export default function WarehouseCard({ warehouse, locationCount, onDelete }) {
  return (
    <div className="group rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 hover:border-white/20 transition-all duration-200 shadow-sm hover:shadow-md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-11 w-11 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/20 transition-colors">
            <WarehouseIcon className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-50 mb-1 truncate">
              {warehouse.name}
            </h3>
            <p className="text-sm text-slate-400 mb-2">
              Code: <span className="text-slate-300 font-mono">{warehouse.shortCode}</span>
            </p>
            <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
              {warehouse.address}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (window.confirm(`Are you sure you want to delete ${warehouse.name}?`)) {
              onDelete(warehouse.id);
            }
          }}
          className="ml-2 p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all flex-shrink-0"
          title="Delete warehouse"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      
      <div className="flex items-center gap-2 pt-3 border-t border-white/5">
        <MapPin className="h-4 w-4 text-slate-500" />
        <span className="text-sm text-slate-400">
          {locationCount} {locationCount === 1 ? 'Location' : 'Locations'}
        </span>
      </div>
    </div>
  );
}

