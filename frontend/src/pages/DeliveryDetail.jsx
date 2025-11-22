import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import * as api from '../utils/api';

// Generate reference in format WH/OUT/0001
function generateReference(id, warehouse = 'WH') {
  const paddedId = String(id).padStart(4, '0');
  return `${warehouse}/OUT/${paddedId}`;
}

export default function DeliveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { deliveries, products, user, updateDelivery, addDelivery, deleteDelivery, showToast } = useApp();
  const isNew = id === 'new';

  const [formData, setFormData] = useState({
    reference: '',
    toCustomer: '',
    contact: '',
    responsible: user?.name || '',
    scheduleDate: new Date().toISOString().split('T')[0],
    status: 'draft',
    deliveryAddress: '',
  });

  const [deliveryProducts, setDeliveryProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ product: '', quantity: '' });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const pendingDeliveryRef = useRef(null);
  const isUpdatingStatusRef = useRef(false);

  // Watch for newly created deliveries when creating a new delivery
  useEffect(() => {
    if (isNew && pendingDeliveryRef.current && deliveries.length > 0) {
      const newDelivery = deliveries
        .filter(d => 
          d.to_customer === pendingDeliveryRef.current.to_customer &&
          d.schedule_date === pendingDeliveryRef.current.schedule_date &&
          d.status === pendingDeliveryRef.current.status
        )
        .sort((a, b) => b.id - a.id)[0];
      
      if (newDelivery && newDelivery.id) {
        if (pendingDeliveryRef.current && !pendingDeliveryRef.current.shouldNavigate) {
          window.history.replaceState(null, '', `/deliveries/${newDelivery.id}`);
          setFormData(prev => ({
            ...prev,
            reference: generateReference(newDelivery.id),
            status: newDelivery.status,
          }));
        }
        pendingDeliveryRef.current = null;
      }
    }
  }, [deliveries, isNew, id]);

  // Load delivery data
  useEffect(() => {
    if (!isNew && id) {
      setLoading(true);
      const delivery = deliveries.find((d) => d.id === parseInt(id));
      if (delivery) {
        const currentStatus = delivery.status || 'draft';
        if (formData.status !== currentStatus || !formData.toCustomer) {
          setFormData({
            reference: delivery.reference || generateReference(delivery.id),
            toCustomer: delivery.to_customer || delivery.customer || '',
            contact: delivery.contact || '',
            responsible: delivery.responsible || user?.name || '',
            scheduleDate: delivery.schedule_date || delivery.date || new Date().toISOString().split('T')[0],
            status: currentStatus,
            deliveryAddress: delivery.delivery_address || '',
          });
        }
        
        if (delivery.items && delivery.items.length > 0 && deliveryProducts.length === 0) {
          const transformedProducts = delivery.items.map((item) => {
            if (item.productName) {
              return {
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
              };
            }
            const product = products.find((p) => p.id === item.productId);
            return {
              productId: item.productId,
              productName: product ? `[${product.sku}] ${product.name}` : 'Unknown Product',
              quantity: item.quantity,
            };
          });
          setDeliveryProducts(transformedProducts);
        } else if (delivery.items && delivery.items.length > 0) {
          const transformedProducts = delivery.items.map((item) => {
            if (item.productName) {
              return {
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
              };
            }
            const product = products.find((p) => p.id === item.productId);
            return {
              productId: item.productId,
              productName: product ? `[${product.sku}] ${product.name}` : 'Unknown Product',
              quantity: item.quantity,
            };
          });
          if (JSON.stringify(transformedProducts) !== JSON.stringify(deliveryProducts)) {
            setDeliveryProducts(transformedProducts);
          }
        }
      } else {
        // Try fetching from API if not in context
        api.fetchDeliveryById(id).then(delivery => {
          setFormData({
            reference: delivery.reference || generateReference(delivery.id),
            toCustomer: delivery.to_customer || delivery.customer || '',
            contact: delivery.contact || '',
            responsible: delivery.responsible || user?.name || '',
            scheduleDate: delivery.schedule_date || delivery.date || new Date().toISOString().split('T')[0],
            status: delivery.status || 'draft',
            deliveryAddress: delivery.delivery_address || '',
          });
          if (delivery.items) {
            const transformedProducts = delivery.items.map((item) => {
              const product = products.find((p) => p.id === item.productId);
              return {
                productId: item.productId,
                productName: product ? `[${product.sku}] ${product.name}` : 'Unknown Product',
                quantity: item.quantity,
              };
            });
            setDeliveryProducts(transformedProducts);
          }
        }).catch(err => {
          console.error('Error fetching delivery:', err);
          showToast('Failed to load delivery', 'error');
          navigate('/deliveries');
        });
      }
      setLoading(false);
    } else if (isNew) {
      const nextId = deliveries.length > 0 ? Math.max(...deliveries.map((d) => d.id)) + 1 : 1;
      if (!formData.reference || formData.reference === generateReference(nextId)) {
        setFormData({
          reference: generateReference(nextId),
          toCustomer: '',
          contact: '',
          responsible: user?.name || '',
          scheduleDate: new Date().toISOString().split('T')[0],
          status: 'draft',
          deliveryAddress: '',
        });
        if (deliveryProducts.length === 0) {
          setDeliveryProducts([]);
        }
      }
    }
  }, [id, deliveries, products, user, isNew, navigate, showToast]);

  const handleFieldChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.toCustomer?.trim()) {
      newErrors.toCustomer = 'Customer is required';
    }
    
    if (!formData.scheduleDate) {
      newErrors.scheduleDate = 'Schedule Date is required';
    }
    
    if (deliveryProducts.length === 0) {
      newErrors.products = 'At least one product is required';
    }
    
    deliveryProducts.forEach((product, index) => {
      if (!product.productName?.trim() && !product.product?.trim()) {
        newErrors[`product_${index}`] = 'Product name is required';
      }
      if (!product.quantity || product.quantity <= 0) {
        newErrors[`quantity_${index}`] = 'Valid quantity is required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddProduct = () => {
    if (!newProduct.product?.trim()) {
      setErrors({ ...errors, newProduct: 'Product name is required' });
      return;
    }
    if (!newProduct.quantity || parseFloat(newProduct.quantity) <= 0) {
      setErrors({ ...errors, newQuantity: 'Valid quantity is required' });
      return;
    }
    
    const product = products.find((p) => 
      p.name.toLowerCase().includes(newProduct.product.toLowerCase()) ||
      p.sku.toLowerCase().includes(newProduct.product.toLowerCase())
    );
    
    setDeliveryProducts([
      ...deliveryProducts,
      {
        productId: product?.id || null,
        productName: product ? `[${product.sku}] ${product.name}` : newProduct.product,
        quantity: parseFloat(newProduct.quantity),
      },
    ]);
    setNewProduct({ product: '', quantity: '' });
    setErrors({ ...errors, newProduct: '', newQuantity: '' });
  };

  const handleRemoveProduct = (index) => {
    setDeliveryProducts(deliveryProducts.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index, delta) => {
    const updatedProducts = [...deliveryProducts];
    const newQuantity = (updatedProducts[index].quantity || 0) + delta;
    if (newQuantity > 0) {
      updatedProducts[index].quantity = newQuantity;
      setDeliveryProducts(updatedProducts);
    }
  };

  const handleNewQuantityChange = (delta) => {
    const currentQty = parseFloat(newProduct.quantity) || 0;
    const newQty = currentQty + delta;
    if (newQty >= 0) {
      setNewProduct({ ...newProduct, quantity: newQty.toString() });
    }
  };

  const saveDelivery = async (status = formData.status, shouldNavigate = false) => {
    if (status === 'draft') {
      if (!formData.toCustomer?.trim()) {
        setErrors({ ...errors, toCustomer: 'Customer is required' });
        return false;
      }
    } else {
      if (!validateForm()) {
        return false;
      }
    }

    const deliveryData = {
      to_customer: formData.toCustomer,
      customer: formData.toCustomer,
      contact: formData.contact || '',
      schedule_date: formData.scheduleDate || new Date().toISOString().split('T')[0],
      delivery_address: formData.deliveryAddress || '',
      responsible: formData.responsible || user?.name || '',
      status: status,
      items: deliveryProducts.map((p) => ({
        productId: p.productId,
        productName: p.productName,
        quantity: p.quantity,
      })),
    };

    try {
      if (isNew) {
        pendingDeliveryRef.current = { ...deliveryData, shouldNavigate };
        await addDelivery(deliveryData);
        if (shouldNavigate) {
          setTimeout(() => {
            navigate('/deliveries');
            pendingDeliveryRef.current = null;
          }, 300);
        }
      } else {
        await updateDelivery(parseInt(id), deliveryData);
        setFormData({ ...formData, status: status });
        showToast('Delivery updated successfully', 'success');
      }
      return true;
    } catch (error) {
      console.error('Error saving delivery:', error);
      showToast(error.message || 'Failed to save delivery', 'error');
      return false;
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    await saveDelivery('draft', true);
    setTimeout(() => {
      setIsSaving(false);
    }, 500);
  };

  const handleValidate = async () => {
    if (!validateForm()) {
      return;
    }

    if (formData.status === 'draft') {
      // TODO: Move Draft → Waiting (or Ready based on business logic)
      try {
        if (isNew) {
          const preservedProducts = [...deliveryProducts];
          isUpdatingStatusRef.current = true;
          pendingDeliveryRef.current = { ...formData, status: 'waiting', shouldNavigate: false };
          await addDelivery({
            ...formData,
            status: 'waiting',
            items: deliveryProducts.map((p) => ({
              productId: p.productId,
              productName: p.productName,
              quantity: p.quantity,
            })),
          });
          setDeliveryProducts(preservedProducts);
          setTimeout(() => {
            isUpdatingStatusRef.current = false;
          }, 300);
        } else {
          await updateDelivery(parseInt(id), {
            ...formData,
            status: 'waiting',
            items: deliveryProducts.map((p) => ({
              productId: p.productId,
              productName: p.productName,
              quantity: p.quantity,
            })),
          });
          setFormData({ ...formData, status: 'waiting' });
        }
      } catch (error) {
        console.error('Error validating delivery:', error);
        showToast(error.message || 'Failed to validate delivery', 'error');
      }
    } else if (formData.status === 'waiting') {
      // Validate: Move Waiting → Ready
      try {
        if (!isNew) {
          await api.validateDelivery(parseInt(id));
          const updatedDeliveries = await api.fetchDeliveries();
          const deliveryList = Array.isArray(updatedDeliveries) ? updatedDeliveries : (updatedDeliveries.deliveries || []);
          const updated = deliveryList.find(d => d.id === parseInt(id));
          if (updated) {
            setFormData({ ...formData, status: updated.status });
          }
          showToast('Delivery validated successfully', 'success');
        }
      } catch (error) {
        console.error('Error validating delivery:', error);
        showToast(error.message || 'Failed to validate delivery', 'error');
      }
    } else if (formData.status === 'ready') {
      // Process: Move Ready → Done
      try {
        if (!isNew) {
          await api.processDelivery(parseInt(id));
          setFormData({ ...formData, status: 'done' });
          showToast('Delivery processed successfully', 'success');
        }
      } catch (error) {
        console.error('Error processing delivery:', error);
        showToast(error.message || 'Failed to process delivery', 'error');
      }
    }
  };

  const handleCancel = () => {
    navigate('/deliveries');
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this delivery? This action cannot be undone.')) {
      if (!isNew) {
        try {
          await deleteDelivery(parseInt(id));
          showToast('Delivery deleted successfully', 'success');
          navigate('/deliveries');
        } catch (error) {
          console.error('Error deleting delivery:', error);
          showToast(error.message || 'Failed to delete delivery', 'error');
        }
      }
    }
  };

  const getStatusFlow = () => {
    const statuses = ['Draft', 'Waiting', 'Ready', 'Done'];
    const currentIndex = statuses.findIndex((s) => s.toLowerCase() === formData.status);
    
    return statuses.map((status, index) => ({
      label: status,
      isActive: index <= currentIndex,
      isCurrent: index === currentIndex,
    }));
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-400">Loading delivery...</div>;
  }

  const statusFlow = getStatusFlow();
  const canPrint = formData.status === 'done';
  const canValidate = formData.status === 'ready' || formData.status === 'waiting';
  const canTodo = formData.status === 'draft';
  const canSaveDraft = formData.status !== 'done';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => navigate('/deliveries')}
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              New
            </button>
            <span className="text-slate-400">|</span>
            <h1 className="text-2xl font-semibold text-slate-50">Delivery</h1>
          </div>
          <p className="text-sm text-slate-400">Manage delivery details</p>
        </div>

        {/* Status Flow */}
        <div className="flex items-center gap-2">
          {statusFlow.map((status, index) => (
            <div key={status.label} className="flex items-center">
              <span
                className={`text-xs font-medium ${
                  status.isActive ? 'text-indigo-400' : 'text-slate-500'
                }`}
              >
                {status.label}
              </span>
              {index < statusFlow.length - 1 && (
                <span className="mx-2 text-slate-500">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {canSaveDraft && (
          <Button
            onClick={handleSaveDraft}
            variant="secondary"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
        )}
        {canTodo && (
          <Button
            onClick={handleValidate}
            variant="secondary"
          >
            TODO
          </Button>
        )}
        {canValidate && (
          <Button
            onClick={handleValidate}
            variant="primary"
          >
            {formData.status === 'waiting' ? 'Validate' : 'Process'}
          </Button>
        )}
        {canPrint && (
          <Button
            onClick={() => window.print()}
            variant="secondary"
          >
            Print
          </Button>
        )}
        {!isNew && (
          <Button
            onClick={handleDelete}
            variant="danger"
          >
            Delete
          </Button>
        )}
        <Button
          onClick={handleCancel}
          variant="secondary"
        >
          Cancel
        </Button>
      </div>

      {/* Form Fields */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4">
        <Input
          label="Reference"
          value={formData.reference}
          readOnly
        />
        <div>
          <Input
            label="Customer"
            value={formData.toCustomer}
            onChange={(e) => handleFieldChange('toCustomer', e.target.value)}
            placeholder="Customer name"
            required
          />
          {errors.toCustomer && (
            <p className="mt-1 text-xs text-rose-400">{errors.toCustomer}</p>
          )}
        </div>
        <div>
          <Input
            label="Contact"
            value={formData.contact}
            onChange={(e) => handleFieldChange('contact', e.target.value)}
            placeholder="Contact person"
          />
        </div>
        <Input
          label="Responsible"
          value={formData.responsible}
          readOnly
        />
        <div>
          <Input
            label="Schedule Date"
            type="date"
            value={formData.scheduleDate}
            onChange={(e) => handleFieldChange('scheduleDate', e.target.value)}
            required
          />
          {errors.scheduleDate && (
            <p className="mt-1 text-xs text-rose-400">{errors.scheduleDate}</p>
          )}
        </div>
        <div>
          <Input
            label="Delivery Address"
            value={formData.deliveryAddress}
            onChange={(e) => handleFieldChange('deliveryAddress', e.target.value)}
            placeholder="Delivery address"
          />
        </div>
        {errors.products && (
          <p className="text-xs text-rose-400">{errors.products}</p>
        )}
      </div>

      {/* Products Table */}
      <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
        <div className="border-b border-white/10 bg-white/5 px-4 py-3">
          <h3 className="text-sm font-medium text-slate-300">Products</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Product</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {deliveryProducts.map((product, index) => (
                <tr key={index} className="hover:bg-white/5">
                  <td className="py-3 px-4 text-sm text-slate-200">
                    {product.productName || `[${product.productId}] ${product.name || 'Product'}`}
                    {errors[`product_${index}`] && (
                      <p className="mt-1 text-xs text-rose-400">{errors[`product_${index}`]}</p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuantityChange(index, -1)}
                        className="p-1 rounded-md border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                        type="button"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <span className="text-sm text-slate-300 min-w-[3rem] text-center">
                        {product.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(index, 1)}
                        className="p-1 rounded-md border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                        type="button"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveProduct(index)}
                        className="p-1 rounded-md border border-white/10 bg-white/5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors ml-2"
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {errors[`quantity_${index}`] && (
                      <p className="mt-1 text-xs text-rose-400">{errors[`quantity_${index}`]}</p>
                    )}
                  </td>
                </tr>
              ))}
              {/* New Product Row */}
              <tr className="bg-white/5">
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={newProduct.product || ''}
                    onChange={(e) => {
                      setNewProduct({ ...newProduct, product: e.target.value });
                      if (errors.newProduct) {
                        setErrors({ ...errors, newProduct: '' });
                      }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddProduct();
                      }
                    }}
                    placeholder="New Product"
                    className={`w-full px-3 py-2 text-sm rounded-md border ${
                      errors.newProduct ? 'border-rose-500' : 'border-white/10'
                    } bg-white/5 text-slate-200 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30`}
                  />
                  {errors.newProduct && (
                    <p className="mt-1 text-xs text-rose-400">{errors.newProduct}</p>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleNewQuantityChange(-1)}
                      className="p-1 rounded-md border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                      type="button"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      value={newProduct.quantity || ''}
                      onChange={(e) => {
                        setNewProduct({ ...newProduct, quantity: e.target.value });
                        if (errors.newQuantity) {
                          setErrors({ ...errors, newQuantity: '' });
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddProduct();
                        }
                      }}
                      placeholder="Quantity"
                      min="0"
                      step="0.01"
                      className={`flex-1 px-3 py-2 text-sm rounded-md border ${
                        errors.newQuantity ? 'border-rose-500' : 'border-white/10'
                      } bg-white/5 text-slate-200 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30`}
                    />
                    <button
                      onClick={() => handleNewQuantityChange(1)}
                      className="p-1 rounded-md border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                      type="button"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <Button
                      onClick={handleAddProduct}
                      variant="secondary"
                      className="ml-2"
                    >
                      Add
                    </Button>
                  </div>
                  {errors.newQuantity && (
                    <p className="mt-1 text-xs text-rose-400">{errors.newQuantity}</p>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
