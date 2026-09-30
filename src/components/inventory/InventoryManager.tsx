import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  DeleteOutlined as DeleteIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Inventory as RestockIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { Product, EventConfig } from '../../types';
import { CATEGORY_META } from '../../data/categories';
import { formatCurrency, exportInventoryToCSV } from '../../utils/export';
import { soundEngine } from '../../utils/audio';
import { ProductFormModal } from './ProductFormModal';
import { ProductThumb } from '../common/ProductThumb';
import { QuickRestockModal } from './QuickRestockModal';
import { ImportItemsModal } from './ImportItemsModal';
const officialLogo = `${import.meta.env.BASE_URL}ChibishoppuLogo2.jpeg`;

interface InventoryManagerProps {
  products: Product[];
  eventConfig: EventConfig;
  onAddProduct: (product: Product, imageBlob?: Blob | null, removeImage?: boolean) => void;
  onUpdateProduct: (product: Product, imageBlob?: Blob | null, removeImage?: boolean) => void;
  onDeleteProduct: (id: string) => void;
  onImportProducts: (items: Product[]) => void;
  onBatchRestock: (updates: { id: string; addQty: number }[]) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  products,
  eventConfig,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onImportProducts,
  onBatchRestock,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Category pills scroll affordance — arrows appear when the row overflows
  const pillsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updatePillScroll = () => {
    const el = pillsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updatePillScroll();
    window.addEventListener('resize', updatePillScroll);
    return () => window.removeEventListener('resize', updatePillScroll);
  }, [products]);

  // Inventory stats calculations
  const totalStockUnits = useMemo(() => products.reduce((s, p) => s + p.stock, 0), [products]);
  const totalRetailValue = useMemo(() => products.reduce((s, p) => s + (p.price * p.stock), 0), [products]);
  const totalCostValue = useMemo(() => products.reduce((s, p) => s + (p.cost * p.stock), 0), [products]);
  const lowStockItems = useMemo(
    () => products.filter((p) => p.stock <= p.lowStockThreshold),
    [products]
  );

  // Filtered list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase())) ||
        p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchLow = !onlyLowStock || p.stock <= p.lowStockThreshold;

      return matchCat && matchSearch && matchLow;
    });
  }, [products, selectedCategory, search, onlyLowStock]);

  const handleQuickAdjust = (product: Product, delta: number) => {
    const nextStock = Math.max(0, product.stock + delta);
    soundEngine.playPop();
    onUpdateProduct({ ...product, stock: nextStock });
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the catalogue?`)) {
      soundEngine.playVoid();
      onDeleteProduct(id);
    }
  };

  return (
    <div className="flex flex-col gap-4 select-none pb-8">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-2.5 sm:p-3 rounded-3xl bg-white border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548]">
          <span className="text-[9px] font-medium uppercase text-[#616D86] tracking-wider block">
            TOTAL STOCK UNITS
          </span>
          <div className="text-lg sm:text-xl font-medium text-[#2D3548] mt-0.5 font-sans">
            {totalStockUnits} <span className="text-[10px] font-medium text-[#616D86]">pcs</span>
          </div>
          <span className="text-[9px] font-normal text-[#616D86] mt-0.5 block">
            Across {products.length} catalogue items
          </span>
        </div>

        <div className="p-2.5 sm:p-3 rounded-3xl bg-[#A3E7D0] border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548]">
          <span className="text-[9px] font-medium uppercase text-[#1B5E45] tracking-wider block">
            EST. RETAIL VALUE
          </span>
          <div className="text-lg sm:text-xl font-medium text-[#1B5E45] mt-0.5 font-sans">
            {formatCurrency(totalRetailValue, eventConfig.currencySymbol)}
          </div>
          <span className="text-[9px] font-normal text-[#1B5E45]/80 mt-0.5 block">
            Potential gross booth sales
          </span>
        </div>

        <div className="p-2.5 sm:p-3 rounded-3xl bg-[#D8EDFC] border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548]">
          <span className="text-[9px] font-medium uppercase text-[#2D3548] tracking-wider block">
            INVENTORY COST (COGS)
          </span>
          <div className="text-lg sm:text-xl font-medium text-[#2D3548] mt-0.5 font-sans">
            {formatCurrency(totalCostValue, eventConfig.currencySymbol)}
          </div>
          <span className="text-[9px] font-normal text-[#616D86] mt-0.5 block">
            Margin: {totalRetailValue > 0 ? `${Math.round(((totalRetailValue - totalCostValue) / totalRetailValue) * 100)}%` : '0%'}
          </span>
        </div>

        <div
          onClick={() => setOnlyLowStock(!onlyLowStock)}
          className={`p-2.5 sm:p-3 rounded-3xl border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548] cursor-pointer transition-all active:translate-y-0.5 active:shadow-[2px_2px_0px_#2D3548] ${
            lowStockItems.length > 0 ? 'bg-[#FFE699]' : 'bg-white'
          }`}
        >
          <span className="text-[9px] font-medium uppercase text-[#616D86] tracking-wider block">
            LOW STOCK ALERTS
          </span>
          <div className="text-lg sm:text-xl font-medium text-[#2D3548] mt-0.5 font-sans">
            {lowStockItems.length} <span className="text-[10px] font-medium text-[#616D86]">items</span>
          </div>
          <span className="text-[9px] font-normal text-[#616D86] mt-0.5 block">
            {onlyLowStock ? 'Showing Low Stock (Click to Reset)' : 'Click to filter low stock'}
          </span>
        </div>
      </div>

      {/* Low Stock Warning Alert if any */}
      {lowStockItems.length > 0 && !onlyLowStock && (
        <div className="p-3.5 rounded-2xl bg-[#FFE699] border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img
              src={officialLogo}
              alt="Chibishoppu Logo"
              className="w-8 h-8 rounded-xl border-2 border-[#2D3548] object-cover bg-white shrink-0"
              referrerPolicy="no-referrer"
            />
            <p className="text-xs sm:text-sm font-black text-[#2D3548]">
              <strong>Convention Rush Alert:</strong> {lowStockItems.length} product(s) are running low! ({lowStockItems.slice(0, 2).map((p) => p.name).join(', ')})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlyLowStock(true)}
              className="bg-white hover:bg-[#F4F9FE] text-[#2D3548] border-2 border-[#2D3548] px-3 py-1 rounded-xl text-xs font-black shadow-[1px_1px_0px_#2D3548]"
            >
              View ({lowStockItems.length})
            </button>
            <button
              onClick={() => setIsRestockOpen(true)}
              className="bg-[#FF85A1] hover:bg-[#FF6B8D] text-white border-2 border-[#2D3548] px-3 py-1 rounded-xl text-xs font-black shadow-[1px_1px_0px_#2D3548]"
            >
              Quick Restock
            </button>
          </div>
        </div>
      )}

      {/* Search & Category Filters */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-white border-3 sm:border-4 border-[#2D3548] shadow-[4px_4px_0px_#2D3548] flex flex-col gap-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#616D86]" sx={{ fontSize: 18 }} />
          <input
            type="text"
            placeholder="Search SKU, barcode, name, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-[#2D3548] placeholder-[#616D86]/60 focus:outline-none shadow-[2px_2px_0px_#2D3548]"
          />
        </div>

        {/* Category pills — permanently visible scrollbar + arrows on overflow */}
        <div className="relative">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => pillsRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
              className="absolute left-0 top-1/2 -translate-y-[calc(50%+5px)] z-10 w-7 h-7 rounded-full bg-white border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] flex items-center justify-center active:translate-y-0.5"
              aria-label="Scroll categories left"
            >
              <ChevronLeftIcon sx={{ fontSize: 18 }} />
            </button>
          )}
          <div
            ref={pillsRef}
            onScroll={updatePillScroll}
            className="pill-scroll flex items-center gap-1.5 overflow-x-auto pb-2"
          >
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-xl text-xs font-black border-2 border-[#2D3548] uppercase shadow-[1px_1px_0px_#2D3548] transition-all whitespace-nowrap ${
                selectedCategory === 'all' ? 'bg-[#FF85A1] text-white' : 'bg-white text-[#2D3548] hover:bg-[#F4F9FE]'
              }`}
            >
              All
            </button>
            {Object.entries(CATEGORY_META).map(([catKey, meta]) => (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-2.5 py-1 rounded-xl text-xs font-black border-2 border-[#2D3548] whitespace-nowrap shadow-[1px_1px_0px_#2D3548] transition-all flex items-center gap-1 ${
                  selectedCategory === catKey ? 'bg-[#FF85A1] text-white' : 'bg-white text-[#2D3548] hover:bg-[#F4F9FE]'
                }`}
              >
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
              </button>
            ))}
          </div>
          {canScrollRight && (
            <button
              type="button"
              onClick={() => pillsRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
              className="absolute right-0 top-1/2 -translate-y-[calc(50%+5px)] z-10 w-7 h-7 rounded-full bg-white border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] flex items-center justify-center active:translate-y-0.5"
              aria-label="Scroll categories right"
            >
              <ChevronRightIcon sx={{ fontSize: 18 }} />
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-3 sm:p-3.5 rounded-3xl bg-white border-3 sm:border-4 border-[#2D3548] shadow-[4px_4px_0px_#2D3548]">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportInventoryToCSV(products)}
            className="flex items-center gap-1.5 bg-white hover:bg-[#F4F9FE] text-[#2D3548] border-2 border-[#2D3548] px-3 py-1.5 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
          >
            <ExportIcon sx={{ fontSize: 16 }} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 bg-[#FFE699] hover:bg-[#FFDF6B] text-[#2D3548] border-2 border-[#2D3548] px-3 py-1.5 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
          >
            <ImportIcon sx={{ fontSize: 16 }} />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setIsRestockOpen(true)}
            className="flex items-center gap-1.5 bg-[#D8EDFC] hover:bg-[#BEE0FB] text-[#2D3548] border-2 border-[#2D3548] px-3 py-1.5 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
          >
            <RestockIcon sx={{ fontSize: 16 }} />
            <span>Batch Restock</span>
          </button>

          <button
            onClick={() => {
              setEditingProduct(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-1.5 bg-[#FF85A1] hover:bg-[#FF6B8D] text-white border-2 border-[#2D3548] px-3.5 py-1.5 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
          >
            <AddIcon sx={{ fontSize: 16 }} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-3xl border-3 sm:border-4 border-[#2D3548] shadow-[5px_5px_0px_#2D3548] overflow-hidden">
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#FFD6E8', borderBottom: '3px solid #2D3548' }}>
                <TableCell sx={{ fontWeight: 900, color: '#2D3548', fontSize: '0.75rem', letterSpacing: '0.05em' }}>PRODUCT</TableCell>
                <TableCell sx={{ fontWeight: 900, color: '#2D3548', fontSize: '0.75rem', letterSpacing: '0.05em' }}>SKU / BARCODE</TableCell>
                <TableCell sx={{ fontWeight: 900, color: '#2D3548', fontSize: '0.75rem', letterSpacing: '0.05em' }}>CATEGORY</TableCell>
                <TableCell sx={{ fontWeight: 900, color: '#2D3548', fontSize: '0.75rem', letterSpacing: '0.05em' }}>PRICE / COST</TableCell>
                <TableCell sx={{ fontWeight: 900, color: '#2D3548', fontSize: '0.75rem', letterSpacing: '0.05em' }}>STOCK LEVEL</TableCell>
                <TableCell sx={{ fontWeight: 900, color: '#2D3548', fontSize: '0.75rem', letterSpacing: '0.05em' }}>TOTAL VALUE</TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, color: '#2D3548', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                  ACTIONS
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-4xl">{products.length === 0 ? '�' : '�🔍'}</span>
                      <p className="text-sm font-black text-[#2D3548]">
                        {products.length === 0
                          ? 'Your catalogue is empty. Click "Add Product" to register your first item!'
                          : 'No products found matching criteria.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;
                  const categoryMeta = CATEGORY_META[product.category];

                  return (
                    <TableRow
                      key={product.id}
                      hover
                      sx={{
                        bgcolor: isOutOfStock ? '#FFF0F3' : isLowStock ? '#FFFBEB' : '#FFFFFF',
                        borderBottom: '2px solid #E3ECF5',
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-[#F4F9FE] border-2 border-[#2D3548] flex items-center justify-center text-xl shadow-[1px_1px_0px_#2D3548] overflow-hidden">
                            <ProductThumb
                              productId={product.id}
                              emoji={product.emoji}
                              imgClassName="w-full h-full object-cover"
                              emojiClassName="text-xl"
                            />
                          </div>
                          <div>
                            <span className="font-black text-[#2D3548] text-sm block leading-tight">
                              {product.name}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-[11px] font-mono font-bold text-[#2D3548] block leading-tight">
                          {product.sku}
                        </span>
                        <span className="text-[10px] font-mono font-medium text-[#616D86] block leading-tight mt-0.5">
                          {product.barcode || '—'}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span
                          className="px-2.5 py-1 rounded-xl text-xs font-black border border-[#2D3548] inline-flex items-center gap-1 shadow-[1px_1px_0px_#2D3548]"
                          style={{
                            backgroundColor: categoryMeta?.bgColor || '#F4F9FE',
                            color: categoryMeta?.color || '#2D3548',
                          }}
                        >
                          <span>{categoryMeta?.emoji}</span>
                          <span>{categoryMeta?.label || product.category}</span>
                        </span>
                      </TableCell>

                      <TableCell>
                        <div>
                          <span className="font-black text-sm text-[#FF85A1] block">
                            {formatCurrency(product.price, eventConfig.currencySymbol)}
                          </span>
                          <span className="text-[9px] font-normal text-[#616D86]">
                            Cost: {formatCurrency(product.cost, eventConfig.currencySymbol)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleQuickAdjust(product, -1)}
                            disabled={product.stock <= 0}
                            className="w-7 h-7 rounded-lg bg-white border border-[#2D3548] flex items-center justify-center text-xs font-black hover:bg-[#FFE2ED] disabled:opacity-40"
                          >
                            -
                          </button>

                          <div className="text-center min-w-[36px]">
                            <span
                              className={`font-black text-sm block leading-none ${
                                isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-[#2D3548]'
                              }`}
                            >
                              {product.stock}
                            </span>
                            <span className="text-[9px] font-bold text-[#616D86]">
                              &lt;{product.lowStockThreshold}
                            </span>
                            {(product.defectiveStock ?? 0) > 0 && (
                              <span className="block text-[9px] font-black text-rose-600 mt-0.5">
                                ⚠{product.defectiveStock}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleQuickAdjust(product, 1)}
                            className="w-7 h-7 rounded-lg bg-[#A3E7D0] border border-[#2D3548] flex items-center justify-center text-xs font-black hover:bg-[#86D4BA]"
                          >
                            +
                          </button>

                          {isOutOfStock ? (
                            <span className="px-2 py-0.5 rounded-lg bg-[#FF85A1] text-white border border-[#2D3548] text-[10px] font-black uppercase shadow-[1px_1px_0px_#2D3548]">
                              Sold Out
                            </span>
                          ) : isLowStock ? (
                            <span className="px-2 py-0.5 rounded-lg bg-[#FFE699] text-[#2D3548] border border-[#2D3548] text-[10px] font-black uppercase shadow-[1px_1px_0px_#2D3548] flex items-center gap-0.5">
                              ⚠️ Low
                            </span>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="font-black text-xs sm:text-sm text-[#2D3548] block">
                          {formatCurrency(product.price * product.stock, eventConfig.currencySymbol)}
                        </span>
                        <span className="text-[10px] font-bold text-[#616D86]">
                          {product.stock} units
                        </span>
                      </TableCell>

                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setIsFormOpen(true);
                            }}
                            title="Edit Product"
                            className="w-7 h-7 bg-white hover:bg-[#F4F9FE] text-[#2D3548] border border-[#2D3548] rounded-lg flex items-center justify-center shadow-[1px_1px_0px_#2D3548]"
                          >
                            <EditIcon sx={{ fontSize: 14 }} />
                          </button>

                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            title="Delete Item"
                            className="w-7 h-7 bg-white hover:bg-[#FFE2ED] text-rose-600 border border-[#2D3548] rounded-lg flex items-center justify-center shadow-[1px_1px_0px_#2D3548]"
                          >
                            <DeleteIcon sx={{ fontSize: 14 }} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      {/* Modals */}
      <ProductFormModal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProduct(null);
        }}
        onSaveProduct={(savedProd, imageBlob, removeImage) => {
          if (editingProduct) {
            onUpdateProduct(savedProd, imageBlob, removeImage);
          } else {
            onAddProduct(savedProd, imageBlob, removeImage);
          }
        }}
        editingProduct={editingProduct}
        currencySymbol={eventConfig.currencySymbol}
        products={products}
      />

      <ImportItemsModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        products={products}
        onImportProducts={onImportProducts}
      />

      <QuickRestockModal
        open={isRestockOpen}
        onClose={() => setIsRestockOpen(false)}
        products={products}
        onBatchRestock={onBatchRestock}
        eventConfig={eventConfig}
      />
    </div>
  );
};
