import { useState } from 'react';
import { useApp } from '../context/AppContext';
import SearchBar from '../components/stock/SearchBar';
import StockTable from '../components/stock/StockTable';
import StockCard from '../components/stock/StockCard';
import EditStockModal from '../components/stock/EditStockModal';
import AddProductModal from '../components/stock/AddProductModal';
import RemoveStockModal from '../components/stock/RemoveStockModal';
import InternalTransferModal from '../components/stock/InternalTransferModal';
import Button from '../components/ui/Button';
import { Plus, Minus, ArrowRightLeft } from 'lucide-react';

export default function Products() {
  const { products, addProduct, updateStock, deleteProduct, showToast, locations, warehouses, refreshProducts } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isRemoveStockModalOpen, setIsRemoveStockModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Filter products based on search term
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setIsStockModalOpen(true);
  };

  const handleCloseStockModal = () => {
    setIsStockModalOpen(false);
    setSelectedProduct(null);
  };

  const handleSave = (stockData) => {
    if (selectedProduct) {
      updateStock(selectedProduct.id, stockData);
      showToast('Stock updated successfully', 'success');
    }
    handleCloseStockModal();
  };

  const handleAddProduct = (productData) => {
    addProduct(productData);
    setIsAddProductModalOpen(false);
  };

  const handleRemoveStock = (productId) => {
    deleteProduct(productId);
    setIsRemoveStockModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Row - Stock Title on Left, Search on Right */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-50 mb-2">Stock</h1>
          <p className="text-sm text-slate-400 hidden sm:block">
            This page contains the warehouse details & location.
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <SearchBar value={searchTerm} onChange={setSearchTerm} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          onClick={() => setIsAddProductModalOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
        <Button
          variant="secondary"
          onClick={() => setIsTransferModalOpen(true)}
          className="gap-2"
        >
          <ArrowRightLeft className="h-4 w-4" />
          Internal Transfer
        </Button>
        <Button
          variant="danger"
          onClick={() => setIsRemoveStockModalOpen(true)}
          className="gap-2"
        >
          <Minus className="h-4 w-4" />
          Remove Stock
        </Button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <StockTable products={filteredProducts} onEdit={handleEdit} />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-sm text-slate-400">No products found</p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <StockCard key={product.id} product={product} onEdit={handleEdit} />
          ))
        )}
      </div>

      {/* Edit Stock Modal */}
      <EditStockModal
        isOpen={isStockModalOpen}
        onClose={handleCloseStockModal}
        product={selectedProduct}
        onSave={handleSave}
      />

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onSave={handleAddProduct}
      />

      {/* Remove Stock Modal */}
      <RemoveStockModal
        isOpen={isRemoveStockModalOpen}
        onClose={() => setIsRemoveStockModalOpen(false)}
        products={products}
        onSave={handleRemoveStock}
      />

      {/* Internal Transfer Modal */}
      <InternalTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        locations={locations || []}
        warehouses={warehouses || []}
        showToast={showToast}
        onTransferComplete={refreshProducts}
      />
    </div>
  );
}
