import { Trash2, AlertCircle } from 'lucide-react';
import Badge from '../ui/Badge';

export default function LineItemsTable({
  items = [],
  products = [],
  onRemoveItem,
  onQuantityChange,
  locationId,
  onStockCheck,
  errors = {}
}) {
  const getProduct = (productId) => {
    return products.find(p => p.id === productId);
  };
  
  const validateQuantity = async (item, newQuantity) => {
    if (!onStockCheck || !item.productId) return true;
    const available = await onStockCheck(item.productId, locationId);
    return parseFloat(newQuantity) <= available;
  };
  
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Product</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Quantity</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Unit</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-400">Available Stock</th>
            <th className="text-right py-3 px-4 text-xs font-medium text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {items.length === 0 ? (
            <tr>
              <td colSpan="5" className="py-8 text-center text-sm text-slate-400">
                No products added. Click "+ New Product" to add items.
              </td>
            </tr>
          ) : (
            items.map((item, index) => {
              const product = getProduct(item.productId);
              const itemError = errors[`item_${index}`] || errors[item.id];
              const hasStockError = itemError?.includes('stock') || itemError?.includes('Insufficient');
              
              return (
                <tr key={item.id || index} className="hover:bg-white/5">
                  <td className="py-3 px-4">
                    <div>
                      <div className="text-sm font-medium text-slate-200">
                        {product ? `[${product.sku}] ${product.name}` : 'Unknown Product'}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity || ''}
                        onChange={(e) => {
                          if (onQuantityChange) {
                            onQuantityChange(index, parseFloat(e.target.value) || 0);
                          }
                        }}
                        className={`w-24 rounded-md border ${
                          hasStockError ? 'border-rose-500 bg-rose-500/10' : 'border-white/10'
                        } bg-white/5 px-2 py-1.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30`}
                      />
                      {hasStockError && (
                        <AlertCircle className="h-4 w-4 text-rose-400" />
                      )}
                    </div>
                    {itemError && (
                      <p className="mt-1 text-xs text-rose-400">{itemError}</p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-300">{product?.uom || ''}</span>
                  </td>
                  <td className="py-3 px-4">
                    {product && (
                      <span className={`text-sm font-medium ${
                        (product.available !== undefined && product.available < item.quantity) 
                          ? 'text-rose-400' 
                          : 'text-slate-300'
                      }`}>
                        {product.available !== undefined 
                          ? `${product.available} ${product.uom}`
                          : `${product.stock || 0} ${product.uom}`
                        }
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onRemoveItem && onRemoveItem(index)}
                      className="rounded-md p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}


