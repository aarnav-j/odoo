import { useState, useEffect, useCallback } from 'react';
import { Search, List, LayoutGrid, Filter, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import * as api from '../../utils/api';
import { useApp } from '../../context/AppContext';

const STATUS_COLORS = {
  done: { bg: '#10B981', text: '#FFFFFF' },
  ready: { bg: '#3B82F6', text: '#FFFFFF' },
  pending: { bg: '#F59E0B', text: '#FFFFFF' }
};

export default function MoveHistoryList() {
  const { showToast } = useApp();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  
  // Filter states
  const [dateFilters, setDateFilters] = useState({
    from_date: '',
    to_date: ''
  });
  
  // Sort states
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const limit = 50;
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  useEffect(() => {
    fetchMoveHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, dateFilters, sortBy, sortOrder]);
  
  const fetchMoveHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(dateFilters.from_date && { from_date: dateFilters.from_date }),
        ...(dateFilters.to_date && { to_date: dateFilters.to_date }),
        sort_by: sortBy,
        sort_order: sortOrder
      };
      const data = await api.fetchMoveHistory(params);
      setMovements(data.movements || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching move history:', error);
      showToast('Failed to load move history', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, dateFilters, sortBy, sortOrder, showToast]);
  
  const handleApplyFilters = () => {
    setFilterModalOpen(false);
    setPage(1);
  };
  
  const handleClearFilters = () => {
    setDateFilters({ from_date: '', to_date: '' });
    setPage(1);
  };
  
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setSortMenuOpen(false);
    setPage(1);
  };
  
  const hasActiveFilters = dateFilters.from_date || dateFilters.to_date;
  const totalPages = Math.ceil(total / limit);
  
  const getDirectionColor = (direction) => {
    return direction === 'in' ? 'text-emerald-400' : direction === 'out' ? 'text-rose-400' : 'text-slate-400';
  };
  
  const getDirectionBgColor = (direction) => {
    return direction === 'in' ? 'bg-emerald-500/10 border-emerald-500/30' : direction === 'out' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-500/10 border-slate-500/30';
  };
  
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-50">Move History</h1>
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by reference, product, or contact"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 border border-white/10 rounded-md p-1 bg-white/5">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Kanban View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          
          {/* Filter Icon */}
          <div className="relative">
            <button
              onClick={() => setFilterModalOpen(true)}
              className={`p-2 rounded border ${
                hasActiveFilters
                  ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
              }`}
              title="Filter"
            >
              <Filter className="h-4 w-4" />
            </button>
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-indigo-500 rounded-full"></span>
            )}
          </div>
          
          {/* Sort Icon */}
          <div className="relative">
            <button
              onClick={() => setSortMenuOpen(!sortMenuOpen)}
              className="p-2 rounded border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
              title="Sort"
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>
            {sortMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-white/10 bg-slate-800 shadow-xl z-50">
                <div className="p-2">
                  <div className="text-xs font-medium text-slate-400 px-2 py-1 mb-1">Sort by</div>
                  {[
                    { value: 'created_at', label: 'Date' },
                    { value: 'reference', label: 'Reference' },
                    { value: 'product', label: 'Product' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSort(option.value)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-white/5 flex items-center justify-between ${
                        sortBy === option.value ? 'text-indigo-300 bg-indigo-500/10' : 'text-slate-300'
                      }`}
                    >
                      <span>{option.label}</span>
                      {sortBy === option.value && (
                        sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Content - List View */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading move history...</div>
      ) : movements.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg">No movements found</p>
          {searchQuery && <p className="text-sm mt-2">Try adjusting your search or filters</p>}
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="text-center py-12 text-slate-400">
          <p>Kanban view coming soon...</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th 
                      className="text-left py-3 px-4 text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200"
                      onClick={() => handleSort('reference')}
                    >
                      <div className="flex items-center gap-1">
                        Reference
                        {sortBy === 'reference' && (
                          sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-indigo-400" /> : <ArrowDown className="h-3 w-3 text-indigo-400" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center gap-1">
                        Date
                        {sortBy === 'created_at' && (
                          sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-indigo-400" /> : <ArrowDown className="h-3 w-3 text-indigo-400" />
                        )}
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Contact</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">From</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">To</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Quantity</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Product</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {movements.map((movement) => (
                    <tr
                      key={movement.id}
                      className={`hover:bg-white/5 ${getDirectionBgColor(movement.direction)}`}
                    >
                      <td className="py-3 px-4">
                        <span className={`text-sm font-medium ${getDirectionColor(movement.direction)}`}>
                          {movement.reference || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-300">
                          {movement.date || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-300">
                          {movement.contact || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-medium ${getDirectionColor(movement.direction)}`}>
                          {movement.fromLocation || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-medium ${getDirectionColor(movement.direction)}`}>
                          {movement.toLocation || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-medium ${getDirectionColor(movement.direction)}`}>
                          {Math.abs(movement.quantity)} {movement.uom || ''}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-slate-300">
                          <div className="font-medium">[{movement.sku}] {movement.productName}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={movement.transactionType === 'delivery' || movement.transactionType === 'transfer_out' ? 'default' : 'success'}
                          className="text-xs font-medium"
                        >
                          {movement.direction === 'in' ? 'In' : movement.direction === 'out' ? 'Out' : 'Adjustment'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
              <div className="text-sm text-slate-400">
                Showing <span className="font-medium text-slate-200">{(page - 1) * limit + 1}</span> to <span className="font-medium text-slate-200">{Math.min(page * limit, total)}</span> of <span className="font-medium text-slate-200">{total}</span> movements
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1 px-3 py-2 rounded border border-white/10 bg-white/5">
                  <span className="text-sm text-slate-300">Page</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={page}
                    onChange={(e) => {
                      const newPage = parseInt(e.target.value);
                      if (newPage >= 1 && newPage <= totalPages) {
                        setPage(newPage);
                      }
                    }}
                    className="w-12 px-2 py-1 bg-slate-900 border border-white/10 rounded text-center text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-sm text-slate-300">of {totalPages}</span>
                </div>

                <Button
                  variant="secondary"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Filter Modal */}
      <Modal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        title="Filter Move History"
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="From Date"
              type="date"
              value={dateFilters.from_date}
              onChange={(e) => setDateFilters({ ...dateFilters, from_date: e.target.value })}
            />
            <Input
              label="To Date"
              type="date"
              value={dateFilters.to_date}
              onChange={(e) => setDateFilters({ ...dateFilters, to_date: e.target.value })}
            />
          </div>
          
          {hasActiveFilters && (
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={handleClearFilters}
                className="text-sm text-rose-400 hover:text-rose-300"
              >
                Clear all filters
              </button>
            </div>
          )}
          
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              variant="secondary"
              onClick={() => setFilterModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleApplyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

