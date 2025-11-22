import { useState, useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import DropdownSelect from '../ui/DropdownSelect';
import * as api from '../../utils/api';

export default function InternalTransferModal({ isOpen, onClose, locations, warehouses, showToast, onTransferComplete }) {
  const [formData, setFormData] = useState({
    from_warehouse_id: null,
    to_warehouse_id: null,
    from_location_id: null,
    to_location_id: null,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [lineItems, setLineItems] = useState([]);
  const [itemForm, setItemForm] = useState({ productId: '', quantity: '' });
  const [errors, setErrors] = useState({});
  const [itemErrors, setItemErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Warehouse options
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

    if (!formData.from_location_id) {
      setItemErrors({ productId: 'Please select source location first' });
      return;
    }

    // Check if product already exists in line items
    const existingIndex = lineItems.findIndex(item => item.productId === parseInt(itemForm.productId));
    const quantity = parseFloat(itemForm.quantity);

    if (existingIndex >= 0) {
      const updatedItems = [...lineItems];
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: updatedItems[existingIndex].quantity + quantity
      };
      setLineItems(updatedItems);
    } else {
      setLineItems([...lineItems, {
        id: Date.now(),
        productId: parseInt(itemForm.productId),
        quantity: quantity
      }]);
    }

    setItemForm({ productId: '', quantity: '' });
    setItemErrors({});
  };

  const handleRemoveItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.from_warehouse_id) {
      newErrors.from_warehouse_id = 'Source warehouse is required';
    }
    if (!formData.to_warehouse_id) {
      newErrors.to_warehouse_id = 'Destination warehouse is required';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (lineItems.length === 0) {
      newErrors.items = 'At least one product is required';
    }
    if (formData.from_warehouse_id === formData.to_warehouse_id &&
        formData.from_location_id === formData.to_location_id) {
      newErrors.to_location_id = 'Source and destination must be different';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    try {
      setLoading(true);
      const transferData = {
        ...formData,
        from_warehouse_id: parseInt(formData.from_warehouse_id),
        to_warehouse_id: parseInt(formData.to_warehouse_id),
        from_location_id: formData.from_location_id ? parseInt(formData.from_location_id) : null,
        to_location_id: formData.to_location_id ? parseInt(formData.to_location_id) : null,
        items: lineItems
      };

      // Create the transfer
      const transferResponse = await api.createTransfer(transferData);
      const transferId = transferResponse?.transfer?.id || transferResponse?.id;

      if (transferId) {
        try {
          // Start the transfer (moves to in_transit and validates stock)
          await api.startTransfer(transferId);
          
          // Complete the transfer immediately to update stock in real-time
          await api.completeTransfer(transferId);
          
          showToast('Internal transfer completed successfully', 'success');
          
          // Refresh products to show updated stock levels
          if (onTransferComplete) {
            await onTransferComplete();
          }
        } catch (error) {
          console.error('Error processing transfer:', error);
          // Still show success for creation, but warn about processing
          showToast('Transfer created but could not be completed automatically', 'warning');
        }
      } else {
        showToast('Internal transfer created successfully', 'success');
      }

      // Reset form
      setFormData({
        from_warehouse_id: null,
        to_warehouse_id: null,
        from_location_id: null,
        to_location_id: null,
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setLineItems([]);
      setItemForm({ productId: '', quantity: '' });
      setErrors({});

      onClose();
    } catch (error) {
      console.error('Error creating transfer:', error);
      showToast(error.response?.data?.message || 'Failed to create transfer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      from_warehouse_id: null,
      to_warehouse_id: null,
      from_location_id: null,
      to_location_id: null,
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setLineItems([]);
    setItemForm({ productId: '', quantity: '' });
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Internal Transfer" size="lg">
      <div className="space-y-4">
        {/* Warehouse Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DropdownSelect
            label="From Warehouse"
            options={warehouseOptions}
            value={formData.from_warehouse_id?.toString() || ''}
            onChange={(e) => setFormData({
              ...formData,
              from_warehouse_id: e.target.value ? parseInt(e.target.value) : null,
              from_location_id: null
            })}
            error={errors.from_warehouse_id}
            required
          />
          <DropdownSelect
            label="To Warehouse"
            options={warehouseOptions}
            value={formData.to_warehouse_id?.toString() || ''}
            onChange={(e) => setFormData({
              ...formData,
              to_warehouse_id: e.target.value ? parseInt(e.target.value) : null,
              to_location_id: null
            })}
            error={errors.to_warehouse_id}
            required
          />
        </div>

        {/* Location Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DropdownSelect
            label="From Location"
            options={fromLocationOptions}
            value={formData.from_location_id?.toString() || ''}
            onChange={(e) => setFormData({
              ...formData,
              from_location_id: e.target.value ? parseInt(e.target.value) : null
            })}
            placeholder="Select source location"
            disabled={!formData.from_warehouse_id}
          />
          <DropdownSelect
            label="To Location"
            options={toLocationOptions}
            value={formData.to_location_id?.toString() || ''}
            onChange={(e) => setFormData({
              ...formData,
              to_location_id: e.target.value ? parseInt(e.target.value) : null
            })}
            error={errors.to_location_id}
            placeholder="Select destination location"
            disabled={!formData.to_warehouse_id}
          />
        </div>

        {/* Date */}
        <Input
          label="Transfer Date"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          error={errors.date}
          required
        />

        {/* Items Section */}
        <div className="border-t border-white/10 pt-4">
          <h3 className="text-sm font-medium text-slate-200 mb-3">Add Products</h3>

          {lineItems.length > 0 && (
            <div className="mb-4 space-y-2 bg-white/5 rounded-lg p-3 border border-white/10">
              {lineItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">
                    Product ID: {item.productId} × {item.quantity}
                  </span>
                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="text-rose-400 hover:text-rose-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {errors.items && <p className="text-xs text-rose-400 mb-2">{errors.items}</p>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Product ID"
              type="number"
              min="1"
              value={itemForm.productId}
              onChange={(e) => {
                setItemForm({ ...itemForm, productId: e.target.value });
                setItemErrors({ ...itemErrors, productId: '' });
              }}
              error={itemErrors.productId}
              placeholder="Enter product ID"
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
              placeholder="Enter quantity"
            />
            <div className="flex items-end">
              <Button
                onClick={handleAddItem}
                variant="secondary"
                className="w-full"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30"
            placeholder="Add any notes..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Transfer'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
