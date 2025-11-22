import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, List, Filter, Eye, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import * as api from '../../utils/api';
import { useApp } from '../../context/AppContext';

const STATUS_COLORS = {
  draft: { bg: '#6B7280', text: '#F9FAFB' },
  in_transit: { bg: '#F59E0B', text: '#FFFFFF' },
  completed: { bg: '#10B981', text: '#FFFFFF' },
  canceled: { bg: '#EF4444', text: '#FFFFFF' }
};

export default function TransferListView() {
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, transfer: null });
  
  const limit = 20;
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef(null);
  
  // Filter states
  const [dateFilters, setDateFilters] = useState({
    from_date: '',
    to_date: ''
  });
  
  // Sort states
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Close sort menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setSortMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  useEffect(() => {
    fetchTransfers();
  }, [page, statusFilter, debouncedSearch, dateFilters, sortBy, sortOrder]);
  
  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(dateFilters.from_date && { from_date: dateFilters.from_date }),
        ...(dateFilters.to_date && { to_date: dateFilters.to_date }),
        sort_by: sortBy,
        sort_order: sortOrder
      };
      const data = await api.fetchTransfers(params);
      setTransfers(data.transfers || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      showToast('Failed to load transfers', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch, dateFilters, sortBy, sortOrder, showToast]);
  
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
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default desc order
      setSortBy(field);
      setSortOrder('desc');
    }
    setSortMenuOpen(false);
    setPage(1);
  };
  
  const hasActiveFilters = dateFilters.from_date || dateFilters.to_date;
  
  const handleDelete = async (transfer) => {
    try {
      await api.deleteTransfer(transfer.id);
      showToast('Transfer deleted successfully', 'success');
      fetchTransfers();
      setDeleteDialog({ open: false, transfer: null });
    } catch (error) {
      console.error('Error deleting transfer:', error);
      showToast(error.response?.data?.message || 'Failed to delete transfer', 'error');
    }
  };
  
  const getStatusBadge = (status) => {
    const color = STATUS_COLORS[status] || STATUS_COLORS.draft;
    return (
      <Badge
        variant={status === 'completed' ? 'success' : status === 'in_transit' ? 'warning' : 'default'}
        className="text-xs font-medium"
      >
        {status === 'in_transit' ? 'In Transit' : status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };
  
  const handleRowClick = (transfer) => {
    navigate(`/transfers/${transfer.id}`);
  };
  
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  
  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setPage(1);
  };
  
  const totalPages = Math.ceil(total / limit);
  
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-50">Internal Transfers</h1>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/transfers/new')}
            variant="primary"
            className="bg-red-500 hover:bg-red-600"
          >
            <Plus className="h-4 w-4" />
            NEW
          </Button>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search transfers by ID, warehouses, or locations"
              value={searchQuery}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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
          <div className="relative" ref={sortMenuRef}>
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
                    { value: 'date', label: 'Date' },
                    { value: 'transfer_id', label: 'Transfer ID' },
                    { value: 'status', label: 'Status' }
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
      
      {/* Status Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {['all', 'draft', 'in_transit', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => handleStatusFilter(status)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === status
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {status === 'in_transit' ? 'In Transit' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Content - List View */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading transfers...</div>
      ) : transfers.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg">No transfers found</p>
          {searchQuery && <p className="text-sm mt-2">Try adjusting your search or filters</p>}
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
                      onClick={() => handleSort('transfer_id')}
                    >
                      <div className="flex items-center gap-1">
                        Transfer ID
                        {sortBy === 'transfer_id' && (
                          sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-indigo-400" /> : <ArrowDown className="h-3 w-3 text-indigo-400" />
                        )}
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">From</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">To</th>
                    <th 
                      className="text-left py-3 px-4 text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        Date
                        {sortBy === 'date' && (
                          sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-indigo-400" /> : <ArrowDown className="h-3 w-3 text-indigo-400" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {sortBy === 'status' && (
                          sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-indigo-400" /> : <ArrowDown className="h-3 w-3 text-indigo-400" />
                        )}
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Items</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {transfers.map((transfer) => (
                    <tr
                      key={transfer.id}
                      onClick={() => handleRowClick(transfer)}
                      className="hover:bg-white/5 cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
                          {transfer.transferId || `TRF-${transfer.id}`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-slate-300">
                          <div className="font-medium">{transfer.fromWarehouse || 'N/A'}</div>
                          {transfer.fromLocation && (
                            <div className="text-xs text-slate-400">{transfer.fromLocation}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-slate-300">
                          <div className="font-medium">{transfer.toWarehouse || 'N/A'}</div>
                          {transfer.toLocation && (
                            <div className="text-xs text-slate-400">{transfer.toLocation}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-300">
                          {transfer.date || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(transfer.status)}</td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-300">
                          {transfer.totalItems || 0} {transfer.totalItems === 1 ? 'item' : 'items'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(transfer);
                            }}
                            className="rounded-md p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-white/5"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {transfer.status === 'draft' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/transfers/${transfer.id}`);
                                }}
                                className="rounded-md p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-white/5"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteDialog({ open: true, transfer });
                                }}
                                className="rounded-md p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/5"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-400">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} transfers
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-300">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
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
        title="Filter Transfers"
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
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, transfer: null })}
        onConfirm={() => handleDelete(deleteDialog.transfer)}
        title="Delete Transfer"
        message={`Are you sure you want to delete transfer "${deleteDialog.transfer?.transferId || `TRF-${deleteDialog.transfer?.id}`}"? This action cannot be undone.`}
      />
    </div>
  );
}

