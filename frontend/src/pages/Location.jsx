import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import TopNav from '../components/layout/TopNav';
import Input from '../components/ui/Input';
import DropdownSelect from '../components/ui/DropdownSelect';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import LocationPill from '../components/settings/LocationPill';
import CollapsibleList from '../components/settings/CollapsibleList';
import { Plus, Warehouse as WarehouseIcon } from 'lucide-react';

export default function Location() {
  const { warehouses, locations, addLocation, deleteLocation } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    shortCode: '',
    warehouseId: '',
  });
  const [errors, setErrors] = useState({});

  // Transform warehouses for dropdown
  const warehouseOptions = useMemo(() => {
    return warehouses.map(warehouse => ({
      label: warehouse.name,
      value: warehouse.id,
    }));
  }, [warehouses]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.shortCode.trim()) {
      newErrors.shortCode = 'Short Code is required';
    }
    if (!formData.warehouseId) {
      newErrors.warehouseId = 'Warehouse is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      addLocation(formData);
      setFormData({ name: '', shortCode: '', warehouseId: '' });
      setErrors({});
      setIsModalOpen(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', shortCode: '', warehouseId: '' });
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
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-50 mb-2">Location</h1>
            </div>
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add New Location
            </Button>
          </div>

          {/* Warehouse Details with Locations */}
          {warehouses.length > 0 ? (
            <div className="space-y-4">
              {warehouses.map((warehouse) => {
                const warehouseLocations = locations.filter(loc => loc.warehouseId === warehouse.id);
                return (
                  <div
                    key={warehouse.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 hover:border-white/20 transition-all shadow-sm"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="h-12 w-12 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                        <WarehouseIcon className="h-6 w-6 text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-slate-50 mb-1">
                          {warehouse.name}
                        </h3>
                        <p className="text-sm text-slate-400">
                          Code: <span className="text-slate-300 font-mono">{warehouse.shortCode}</span>
                        </p>
                      </div>
                    </div>

                    {warehouseLocations.length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-300">Locations/Rooms:</h4>
                        <CollapsibleList
                          items={warehouseLocations}
                          maxVisible={3}
                          renderItem={(location) => (
                            <LocationPill
                              key={location.id}
                              location={location}
                              onDelete={deleteLocation}
                            />
                          )}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-slate-400 italic">No locations added yet</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
              <p className="text-sm text-slate-400">No warehouses found. Please add a warehouse first.</p>
            </div>
          )}
        </div>
      </main>

      {/* Add Location Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCancel}
        title="Add New Location"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            placeholder="Enter location name (e.g., Room 1, Rack A)"
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

          <DropdownSelect
            label="Warehouse"
            options={warehouseOptions}
            value={formData.warehouseId}
            onChange={(value) => handleChange('warehouseId', value)}
            error={errors.warehouseId}
            placeholder="Select a warehouse"
            required
            maxHeight={warehouseOptions.length > 6 ? '200px' : undefined}
          />

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
