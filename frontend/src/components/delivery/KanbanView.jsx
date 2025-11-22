import { useNavigate } from 'react-router-dom';
import Badge from '../ui/Badge';

export default function KanbanView({ deliveries = [] }) {
  const navigate = useNavigate();

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'default',
      waiting: 'warning',
      ready: 'info',
      done: 'success',
      canceled: 'danger',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const columns = [
    { id: 'draft', title: 'Draft', color: 'border-slate-500' },
    { id: 'waiting', title: 'Waiting', color: 'border-amber-500' },
    { id: 'ready', title: 'Ready', color: 'border-blue-500' },
    { id: 'done', title: 'Done', color: 'border-emerald-500' },
  ];

  const getDeliveriesByStatus = (status) => {
    return deliveries.filter((delivery) => delivery.status === status);
  };

  const handleCardClick = (delivery) => {
    navigate(`/deliveries/${delivery.id}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {columns.map((column) => {
        const columnDeliveries = getDeliveriesByStatus(column.id);
        return (
          <div key={column.id} className="flex flex-col">
            <div className={`mb-3 pb-2 border-b-2 ${column.color}`}>
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                {column.title}
              </h3>
              <span className="text-xs text-slate-500">
                {columnDeliveries.length} {columnDeliveries.length === 1 ? 'delivery' : 'deliveries'}
              </span>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-300px)] kanban-scroll">
              {columnDeliveries.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">
                  No deliveries
                </div>
              ) : (
                columnDeliveries.map((delivery) => {
                  return (
                    <div
                      key={delivery.id}
                      onClick={() => handleCardClick(delivery)}
                      className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-all hover:shadow-lg hover:border-indigo-500/30"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-slate-200 mb-1">
                            {delivery.reference || delivery.deliveryId}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {delivery.contact || delivery.to_customer || delivery.customer || 'N/A'}
                          </p>
                        </div>
                        {getStatusBadge(delivery.status)}
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">From:</span>
                          <span className="text-slate-300">{delivery.fromLocation || 'WH/Stock1'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-slate-400">To:</span>
                          <span className="text-slate-300">{delivery.to_customer || delivery.customer || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-slate-400">Date:</span>
                          <span className="text-slate-300">
                            {delivery.scheduleDate || delivery.date || 'N/A'}
                          </span>
                        </div>
                        {delivery.items && delivery.items.length > 0 && (
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-slate-400">Items:</span>
                            <span className="text-slate-300 font-semibold">
                              {delivery.items.length} {delivery.items.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                        )}
                        {delivery.totalItems > 0 && (
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-slate-400">Total Items:</span>
                            <span className="text-slate-300 font-semibold">
                              {delivery.totalItems}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


