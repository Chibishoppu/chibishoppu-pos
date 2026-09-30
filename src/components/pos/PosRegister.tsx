import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Add as PlusIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { Product, CartItem, EventConfig } from '../../types';
import { CATEGORY_META } from '../../data/categories';
import { ProductThumb } from '../common/ProductThumb';
import { formatCurrency } from '../../utils/export';
import { soundEngine } from '../../utils/audio';

interface PosRegisterProps {
  products: Product[];
  eventConfig: EventConfig;
  onAddToCart: (product: Product) => void;
  cart: CartItem[];
  onOpenQuickCustom: () => void;
}

export const PosRegister: React.FC<PosRegisterProps> = ({
  products,
  eventConfig,
  onAddToCart,
  cart,
  onOpenQuickCustom,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Calculate cart quantity map for quick badge indicators
  const cartQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    cart.forEach((item) => {
      map[item.productId] = (map[item.productId] || 0) + item.quantity;
    });
    return map;
  }, [cart]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query)) ||
        p.tags.some((t) => t.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  /**
   * Barcode-scan flow: scanner "types" the code then hits Enter.
   * Exact SKU/barcode match (or a single filtered result) → add to cart & reset
   * for the next scan. Ambiguous/no match → select all text so the next scan
   * replaces it instead of appending.
   */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return;

    const exactMatches = products.filter(
      (p) => p.sku.toLowerCase() === q || (p.barcode && p.barcode.toLowerCase() === q)
    );
    // Only auto-add on an unambiguous match — duplicates fall through to select-all
    const target = exactMatches.length === 1
      ? exactMatches[0]
      : exactMatches.length === 0 && filteredProducts.length === 1
      ? filteredProducts[0]
      : null;

    if (target) {
      handleCardClick(target);
      setSearchQuery('');
      searchInputRef.current?.focus();
    } else {
      e.currentTarget.select();
    }
  };

  const handleCardClick = (product: Product) => {
    if (product.stock <= 0) {
      soundEngine.playVoid();
      return;
    }
    soundEngine.playPop();
    onAddToCart(product);
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Search & Category Filter Bar */}
      <div className="p-3.5 sm:p-4 bg-white border-3 sm:border-4 border-[#2D3548] rounded-3xl shadow-[4px_4px_0px_#2D3548] flex flex-col gap-3">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search items or scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-2xl py-2 pl-10 pr-9 text-sm sm:text-base font-bold text-[#2D3548] placeholder-[#616D86]/60 focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_#2D3548] transition-all"
            />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2D3548] pointer-events-none text-lg" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#616D86] hover:text-[#2D3548]"
              >
                <ClearIcon fontSize="small" />
              </button>
            )}
          </div>

          <button
            onClick={onOpenQuickCustom}
            className="flex items-center gap-1 bg-[#D8EDFC] hover:bg-[#BCE0F9] text-[#2D3548] border-2 border-[#2D3548] px-3.5 py-2 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5 active:shadow-[1px_1px_0px_#2D3548] transition-all whitespace-nowrap"
          >
            <PlusIcon fontSize="small" />
            <span>Custom Item</span>
          </button>
        </div>

        {/* Category Pills — visible scrollbar + arrow affordances on overflow */}
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
            className="pill-scroll flex gap-2 overflow-x-auto pb-2 select-none"
          >
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl border-2 border-[#2D3548] font-black text-xs uppercase tracking-wide whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#2D3548] text-white shadow-[2px_2px_0px_#FF85A1]'
                : 'bg-white text-[#2D3548] hover:bg-[#F4F9FE] hover:shadow-[1px_1px_0px_#2D3548]'
            }`}
          >
            🌸 All Items ({products.length})
          </button>

          {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
            const isSelected = selectedCategory === catKey;
            const count = products.filter((p) => p.category === catKey).length;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                style={{
                  backgroundColor: isSelected ? '#2D3548' : meta.bgColor,
                  color: isSelected ? '#FFFFFF' : '#2D3548',
                }}
                className={`px-3 py-1.5 rounded-xl border-2 border-[#2D3548] font-black text-xs uppercase tracking-wide whitespace-nowrap transition-all ${
                  isSelected
                    ? 'shadow-[2px_2px_0px_#FF85A1]'
                    : 'hover:shadow-[1px_1px_0px_#2D3548] hover:opacity-95'
                }`}
              >
                <span>{meta.emoji} {meta.label}</span>
                <span className={`ml-1.5 px-1.5 py-0.2 rounded text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-[#2D3548]/10 text-[#2D3548]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
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

      {/* Product Cards Grid */}
      <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3 content-start">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-white rounded-3xl border-4 border-dashed border-[#2D3548] shadow-[4px_4px_0px_#2D3548] my-4">
            <span className="text-4xl block mb-2">{products.length === 0 ? '�' : '�🔍'}</span>
            <h3 className="text-xl font-black text-[#2D3548] mb-1">
              {products.length === 0 ? 'No products in catalogue yet' : 'No matching booth items found'}
            </h3>
            <p className="text-sm font-bold text-[#616D86] mb-4">
              {products.length === 0
                ? 'Go to the Inventory tab to add your products, or create a quick custom item below.'
                : 'Try a different keyword or create an instant custom item.'}
            </p>
            <button
              onClick={onOpenQuickCustom}
              className="bg-[#FF85A1] text-white border-2 border-[#2D3548] px-4 py-2 rounded-2xl font-black uppercase text-sm shadow-[3px_3px_0px_#2D3548]"
            >
              + Create Custom Item
            </button>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const inCartCount = cartQuantities[product.id] || 0;
            const isOutOfStock = product.stock <= 0;
            const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;
            const categoryMeta = CATEGORY_META[product.category];

            // Pastel box background based on category
            const pastelBoxBg = categoryMeta?.cardBg || '#D8EDFC';

            return (
              <div
                key={product.id}
                onClick={() => handleCardClick(product)}
                className={`bg-white border-3 sm:border-4 border-[#2D3548] rounded-3xl shadow-[4px_4px_0px_#2D3548] sm:shadow-[5px_5px_0px_#2D3548] flex flex-col overflow-hidden transition-all select-none relative ${
                  isOutOfStock
                    ? 'opacity-60 cursor-not-allowed'
                    : 'cursor-pointer hover:shadow-[7px_7px_0px_#2D3548] hover:-translate-y-1'
                } ${inCartCount > 0 ? 'ring-2 ring-[#FF85A1]' : ''}`}
              >
                {/* Product visual fills the card — constant-height label floats over the bottom */}
                <div
                  style={{ backgroundColor: pastelBoxBg }}
                  className="h-28 sm:h-32 lg:h-36 relative overflow-hidden flex items-center justify-center"
                >
                  <ProductThumb
                    productId={product.id}
                    emoji={product.emoji}
                    imgClassName="absolute inset-0 w-full h-full object-cover"
                    emojiClassName="text-4xl sm:text-5xl filter drop-shadow-sm"
                  />
                  {inCartCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 z-10 min-w-5 h-5 px-1 bg-[#FF85A1] text-white font-black text-[10px] rounded-full border-2 border-[#2D3548] flex items-center justify-center shadow-[1px_1px_0px_#2D3548]">
                      {inCartCount}
                    </span>
                  )}

                  {/* Constant-height semi-transparent label over the image bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-11 bg-white/80 backdrop-blur-[2px] border-t border-[#2D3548]/20 px-1.5 flex flex-col justify-center">
                    <h4
                      className="text-[10px] sm:text-[11px] font-medium text-[#2D3548] leading-tight line-clamp-1"
                      title={product.name}
                    >
                      {product.name}
                    </h4>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] sm:text-xs font-bold text-[#FF85A1] leading-none font-sans">
                        {formatCurrency(product.price, eventConfig.currencySymbol)}
                      </span>
                      {isOutOfStock ? (
                        <span className="text-[8px] font-black uppercase px-1 py-0.2 bg-[#2D3548] text-white rounded leading-none">
                          Sold Out
                        </span>
                      ) : (
                        <span className={`text-[9px] font-medium leading-none ${isLowStock ? 'text-amber-600' : 'text-[#616D86]'}`}>
                          {product.stock} left
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

