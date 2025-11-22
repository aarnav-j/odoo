import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import TopNav from '../components/layout/TopNav';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import WarehouseCard from '../components/settings/WarehouseCard';
import { Plus } from 'lucide-react';

export default function Warehouse() {
  const { warehouses, locations, addWarehouse, deleteWarehouse } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    shortCode: '',
    address: '',
  });
  const [errors, setErrors] = useState({});

  // Calculate location count for each warehouse
  const warehouseLocationCounts = useMemo(() => {
    const counts = {};
    locations.forEach(loc => {
      counts[loc.warehouseId] = (counts[loc.warehouseId] || 0) + 1;
    });
    return counts;
  }, [locations]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.shortCode.trim()) {
      newErrors.shortCode = 'Short Code is required';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      addWarehouse(formData);
      setFormData({ name: '', shortCode: '', address: '' });
      setErrors({});
      setIsModalOpen(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', shortCode: '', address: '' });
    setErrors({});
    setIsModalOpen(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <TopNav />
      <main className="p-4 lg:p-6">
        <div className="space-y-6 animate-fade-in">
          {/* Page Title and Add Button */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-50 mb-2">Warehouse</h1>
            </div>
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add New Warehouse
            </Button>
          </div>

          {/* Warehouses Grid */}
          {warehouses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.map((warehouse) => (
                <WarehouseCard
                  key={warehouse.id}
                  warehouse={warehouse}
                  locationCount={warehouseLocationCounts[warehouse.id] || 0}
                  onDelete={deleteWarehouse}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
              <p className="text-sm text-slate-400">No warehouses yet. Add your first warehouse to get started.</p>
            </div>
          )}
        </div>
      </main>

      {/* Add Warehouse Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCancel}
        title="Add New Warehouse"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            placeholder="Enter warehouse name"
            required
          />

          <Input
            label="Short Code"
            value={formData.shortCode}
            onChange={(e) => handleChange('shortCode', e.target.value)}
            error={errors.shortCode}
            placeholder="Enter short code"
            required
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Address
              <span className="text-rose-400 ml-1">*</span>
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Enter warehouse address"
              rows={4}
              className={`w-full rounded-lg border ${
                errors.address ? 'border-rose-500' : 'border-white/10'
              } bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none transition-all`}
            />
            {errors.address && (
              <p className="mt-1 text-xs text-rose-400">{errors.address}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
