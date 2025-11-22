import { useState, useEffect } from 'react';
import Select from '../ui/Select';

export default function ProductSelector({
  products = [],
  value,
  onChange,
  locationId,
  onStockCheck,
  error,
  required = false
}) {
  const [availableStock, setAvailableStock] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (value && products.length > 0) {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        setLoading(true);
        // Check available stock
        if (onStockCheck) {
          onStockCheck(product.id, locationId).then(stock => {
            setAvailableStock(stock);
            setLoading(false);
          }).catch(() => {
            setAvailableStock(product.stock || 0);
            setLoading(false);
          });
        } else {
          setAvailableStock(product.stock || 0);
          setLoading(false);
        }
      } else {
        setAvailableStock(null);
      }
    } else {
      setAvailableStock(null);
    }
  }, [value, products, locationId, onStockCheck]);
  
  const options = products.map(product => ({
    value: product.id,
    label: `[${product.sku}] ${product.name}`
  }));
  
  const selectedProduct = products.find(p => p.id === parseInt(value));
  
  return (
    <div className="w-full">
      <Select
        label="Product"
        value={value}
        onChange={onChange}
        options={options}
        error={error}
        required={required}
        placeholder="Select a product"
      />
      {selectedProduct && availableStock !== null && (
        <div className="mt-2 text-xs text-slate-400">
          Available stock: <span className={`font-medium ${availableStock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {loading ? 'Checking...' : `${availableStock} ${selectedProduct.uom}`}
          </span>
        </div>
      )}
    </div>
  );
}


