import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, CheckCircle, X, Trash2, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import DropdownSelect from '../ui/DropdownSelect';
import StatusStepper from './StatusStepper';
import ProductSelector from '../delivery/ProductSelector';
import LineItemsTable from '../delivery/LineItemsTable';
import ConfirmDialog from '../ui/ConfirmDialog';
import * as api from '../../utils/api';
import { useApp } from '../../context/AppContext';

export default function TransferForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { products, warehouses, locations, showToast } = useApp();
  const isNew = !id || id === 'new';
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    from_warehouse_id: null,
    to_warehouse_id: null,
    from_location_id: null,
    to_location_id: null,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  const [lineItems, setLineItems] = useState([]);
  const [currentTransfer, setCurrentTransfer] = useState(null);
  const [errors, setErrors] = useState({});
  const [itemForm, setItemForm] = useState({ productId: '', quantity: '' });
  const [itemErrors, setItemErrors] = useState({});
  const [startDialog, setStartDialog] = useState({ open: false });
  const [completeDialog, setCompleteDialog] = useState({ open: false });
  const [deleteDialog, setDeleteDialog] = useState({ open: false });
  
  // Warehouse and location options
  const warehouseOptions = useMemo(() => {
    return warehouses.map(w => ({
      label: w.name,
      value: w.id
    }));
  }, [warehouses]);
  
  const fromLocationOptions = useMemo(() => {
    if (!formData.from_warehouse_id) return [];
    const warehouseId = typeof formData.from_warehouse_id === 'string' 
      ? parseInt(formData.from_warehouse_id) 
      : formData.from_warehouse_id;
    return locations
      .filter(l => l.warehouseId === warehouseId.toString() || l.warehouseId === warehouseId)
      .map(l => ({
        label: l.name,
        value: l.id
      }));
  }, [locations, formData.from_warehouse_id]);
  
  const toLocationOptions = useMemo(() => {
    if (!formData.to_warehouse_id) return [];
    const warehouseId = typeof formData.to_warehouse_id === 'string' 
      ? parseInt(formData.to_warehouse_id) 
      : formData.to_warehouse_id;
    return locations
      .filter(l => l.warehouseId === warehouseId.toString() || l.warehouseId === warehouseId)
      .map(l => ({
        label: l.name,
        value: l.id
      }));
  }, [locations, formData.to_warehouse_id]);
  
  useEffect(() => {
    if (!isNew) {
      fetchTransfer();
    }
  }, [id]);
  
  const fetchTransfer = async () => {
    try {
      setLoading(true);
      const transfer = await api.fetchTransferById(id);
      setCurrentTransfer(transfer);
      setFormData({
        from_warehouse_id: transfer.from_warehouse_id || null,
        to_warehouse_id: transfer.to_warehouse_id || null,
        from_location_id: transfer.from_location_id || null,
        to_location_id: transfer.to_location_id || null,
        date: transfer.date || new Date().toISOString().split('T')[0],
        notes: transfer.notes || ''
      });
      setLineItems(transfer.items || []);
    } catch (error) {
      console.error('Error fetching transfer:', error);
      showToast('Failed to load transfer', 'error');
      navigate('/transfers');
    } finally {
      setLoading(false);
    }
  };
  
  const handleStockCheck = async (productId, locationId) => {
    try {
      const products = await api.fetchAvailableStock(locationId);
      const product = products.find(p => p.id === productId);
      return product?.available || product?.stock || 0;
    } catch (error) {
      console.error('Error checking stock:', error);
      return 0;
    }
  };
  
  const handleAddItem = async () => {
    const newErrors = {};
    
    if (!itemForm.productId) {
      newErrors.productId = 'Please select a product';
    }
    if (!itemForm.quantity || parseFloat(itemForm.quantity) <= 0) {
      newErrors.quantity = 'Please enter a valid quantity';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setItemErrors(newErrors);
      return;
    }
    
    const product = products.find(p => p.id === parseInt(itemForm.productId));
    if (!product) {
      setItemErrors({ productId: 'Product not found' });
      return;
    }
    
    const quantity = parseFloat(itemForm.quantity);
    
    // Check stock availability at source location
    if (!formData.from_location_id) {
      setItemErrors({ productId: 'Please select source location first' });
      return;
    }
    
    try {
      const available = await handleStockCheck(product.id, formData.from_location_id);
      if (quantity > available) {
        setItemErrors({
          quantity: `Insufficient stock. Available: ${available} ${product.uom}`
        });
        return;
      }
      
      // Check if product already exists in line items
      const existingIndex = lineItems.findIndex(item => item.productId === product.id);
      if (existingIndex >= 0) {
        const newQuantity = lineItems[existingIndex].quantity + quantity;
        if (newQuantity > available) {
          setItemErrors({
            quantity: `Total quantity exceeds available stock. Available: ${available} ${product.uom}`
          });
          return;
        }
        const updatedItems = [...lineItems];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: newQuantity
        };
        setLineItems(updatedItems);
      } else {
        setLineItems([...lineItems, {
          id: Date.now(), // Temporary ID
          productId: product.id,
          quantity: quantity,
          productName: product.name,
          sku: product.sku,
          uom: product.uom
        }]);
      }
      
      setItemForm({ productId: '', quantity: '' });
      setItemErrors({});
    } catch (error) {
      console.error('Error checking stock:', error);
      setItemErrors({ quantity: 'Error checking stock availability' });
    }
  };
  
  const handleRemoveItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };
  
  const handleQuantityChange = (index, newQuantity) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: newQuantity
    };
    setLineItems(updatedItems);
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.from_warehouse_id) {
      newErrors.from_warehouse_id = 'Source warehouse is required';
    }
    if (!formData.to_warehouse_id) {
      newErrors.to_warehouse_id = 'Destination warehouse is required';
    }
    if (formData.from_warehouse_id === formData.to_warehouse_id && 
        formData.from_location_id === formData.to_location_id) {
      newErrors.to_location_id = 'Source and destination must be different';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (lineItems.length === 0) {
      newErrors.items = 'At least one product is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSave = async () => {
    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }
    
    try {
      setSaving(true);
      const transferData = {
        ...formData,
        items: lineItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      };
      
      if (isNew) {
        const result = await api.createTransfer(transferData);
        showToast('Transfer created successfully', 'success');
        navigate(`/transfers/${result.transfer.id}`);
      } else {
        await api.updateTransfer(id, transferData);
        showToast('Transfer updated successfully', 'success');
        fetchTransfer();
      }
    } catch (error) {
      console.error('Error saving transfer:', error);
      showToast(error.response?.data?.message || 'Failed to save transfer', 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const handleStart = async () => {
    try {
      setSaving(true);
      await api.startTransfer(id);
      showToast('Transfer started successfully', 'success');
      setStartDialog({ open: false });
      fetchTransfer();
    } catch (error) {
      console.error('Error starting transfer:', error);
      showToast(error.response?.data?.message || 'Failed to start transfer', 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const handleComplete = async () => {
    try {
      setSaving(true);
      await api.completeTransfer(id);
      showToast('Transfer completed successfully', 'success');
      setCompleteDialog({ open: false });
      fetchTransfer();
    } catch (error) {
      console.error('Error completing transfer:', error);
      showToast(error.response?.data?.message || 'Failed to complete transfer', 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async () => {
    try {
      await api.deleteTransfer(id);
      showToast('Transfer deleted successfully', 'success');
      navigate('/transfers');
    } catch (error) {
      console.error('Error deleting transfer:', error);
      showToast(error.response?.data?.message || 'Failed to delete transfer', 'error');
    }
  };
  
  if (loading) {
    return <div className="text-center py-12 text-slate-400">Loading transfer...</div>;
  }
  
  const status = currentTransfer?.status || 'draft';
  const canStart = status === 'draft' && !isNew;
  const canComplete = status === 'in_transit' && !isNew;
  const canEdit = status === 'draft' && !isNew;
  
  // Get products with available stock info
  const productsWithStock = products.map(p => ({
    ...p,
    available: p.stock || 0 // Will be updated by stock check
  }));
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/transfers')}
            className="rounded-md p-2 text-slate-400 hover:text-slate-200 hover:bg-white/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-50">Internal Transfer</h1>
        </div>
        <div className="flex items-center gap-3">
          {!isNew && (
            <>
              {canStart && (
                <Button
                  onClick={() => setStartDialog({ open: true })}
                  variant="success"
                  disabled={saving}
                >
                  <ArrowRight className="h-4 w-4" />
                  Start Transfer
                </Button>
              )}
              {canComplete && (
                <Button
                  onClick={() => setCompleteDialog({ open: true })}
                  variant="success"
                  disabled={saving}
                >
                  <CheckCircle className="h-4 w-4" />
                  Complete Transfer
                </Button>
              )}
              {canEdit && (
                <Button
                  onClick={() => setDeleteDialog({ open: true })}
                  variant="danger"
                  disabled={saving}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              )}
            </>
          )}
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
      
      {/* Status Stepper */}
      {!isNew && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-6">
          <StatusStepper currentStatus={status} />
        </div>
      )}
      
      {/* Transfer Information Section */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Transfer Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              label="Transfer ID"
              value={currentTransfer?.transferId || 'Auto-generated'}
              disabled
              className="font-mono"
            />
          </div>
          <div>
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              error={errors.date}
              required
            />
          </div>
          <div>
            <DropdownSelect
              label="From Warehouse"
              options={warehouseOptions}
              value={formData.from_warehouse_id}
              onChange={(value) => {
                setFormData({ ...formData, from_warehouse_id: value, from_location_id: null });
                setErrors({ ...errors, from_warehouse_id: '' });
              }}
              error={errors.from_warehouse_id}
              placeholder="Select source warehouse"
              required
            />
          </div>
          <div>
            <DropdownSelect
              label="From Location"
              options={fromLocationOptions}
              value={formData.from_location_id}
              onChange={(value) => {
                setFormData({ ...formData, from_location_id: value });
                setErrors({ ...errors, from_location_id: '' });
              }}
              error={errors.from_location_id}
              placeholder="Select source location (optional)"
            />
          </div>
          <div>
            <DropdownSelect
              label="To Warehouse"
              options={warehouseOptions}
              value={formData.to_warehouse_id}
              onChange={(value) => {
                setFormData({ ...formData, to_warehouse_id: value, to_location_id: null });
                setErrors({ ...errors, to_warehouse_id: '' });
              }}
              error={errors.to_warehouse_id}
              placeholder="Select destination warehouse"
              required
            />
          </div>
          <div>
            <DropdownSelect
              label="To Location"
              options={toLocationOptions}
              value={formData.to_location_id}
              onChange={(value) => {
                setFormData({ ...formData, to_location_id: value });
                setErrors({ ...errors, to_location_id: '' });
              }}
              error={errors.to_location_id}
              placeholder="Select destination location (optional)"
            />
          </div>
        </div>
      </div>
      
      {/* Products Table Section */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-200">Products</h2>
        </div>
        
        {/* Add Product Form */}
        {canEdit && (
          <div className="mb-4 p-4 rounded-lg border border-white/10 bg-white/5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ProductSelector
                products={productsWithStock}
                value={itemForm.productId}
                onChange={(e) => {
                  setItemForm({ ...itemForm, productId: e.target.value });
                  setItemErrors({ ...itemErrors, productId: '' });
                }}
                locationId={formData.from_location_id}
                onStockCheck={handleStockCheck}
                error={itemErrors.productId}
                required
              />
              <Input
                label="Quantity"
                type="number"
                min="0.01"
                step="0.01"
                value={itemForm.quantity}
                onChange={(e) => {
                  setItemForm({ ...itemForm, quantity: e.target.value });
                  setItemErrors({ ...itemErrors, quantity: '' });
                }}
                error={itemErrors.quantity}
                required
              />
              <div className="flex items-end">
                <Button onClick={handleAddItem} variant="secondary" className="w-full">
                  <Plus className="h-4 w-4" />
                  Add Product
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Line Items Table */}
        <LineItemsTable
          items={lineItems}
          products={productsWithStock}
          onRemoveItem={canEdit ? handleRemoveItem : null}
          onQuantityChange={canEdit ? handleQuantityChange : null}
          locationId={formData.from_location_id}
          onStockCheck={handleStockCheck}
          errors={errors}
        />
        
        {errors.items && (
          <p className="mt-2 text-xs text-rose-400">{errors.items}</p>
        )}
      </div>
      
      {/* Additional Options Section */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Additional Options</h2>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Notes/Comments
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30"
            placeholder="Add any notes or comments..."
          />
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <Button
          variant="secondary"
          onClick={() => navigate('/transfers')}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="primary"
          disabled={saving || (!canEdit && !isNew)}
        >
          {saving ? 'Saving...' : isNew ? 'Create Transfer' : 'Save Changes'}
        </Button>
      </div>
      
      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={startDialog.open}
        onClose={() => setStartDialog({ open: false })}
        onConfirm={handleStart}
        title="Start Transfer"
        message="Are you sure you want to start this transfer? This will move the transfer status to 'In Transit' and reserve stock at the source location."
      />
      
      <ConfirmDialog
        isOpen={completeDialog.open}
        onClose={() => setCompleteDialog({ open: false })}
        onConfirm={handleComplete}
        title="Complete Transfer"
        message="Are you sure you want to complete this transfer? This will decrease stock at source location, increase stock at destination location, and log entries in the ledger."
      />
      
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false })}
        onConfirm={handleDelete}
        title="Delete Transfer"
        message="Are you sure you want to delete this transfer? This action cannot be undone."
      />
    </div>
  );
}

