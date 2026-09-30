import { useState, useEffect, lazy, Suspense } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import {
  CssBaseline,
  Container,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  VolumeUp as SoundOnIcon,
  VolumeOff as SoundOffIcon,
} from '@mui/icons-material';
import { chibiTheme } from './theme';
import {
  Product,
  CartItem,
  Transaction,
  EventConfig,
  RefundItemDetail,
} from './types';
import { INITIAL_EVENT_CONFIG } from './data/initialData';
import { soundEngine } from './utils/audio';
import { invalidateProductImage, clearProductImageCache } from './hooks/useProductImage';
import { Navbar } from './components/Navbar';
import { PosRegister } from './components/pos/PosRegister';
import { CartPanel } from './components/pos/CartPanel';
import { QuickCustomItemModal } from './components/pos/QuickCustomItemModal';
import { CheckoutModal } from './components/pos/CheckoutModal';
import { ReceiptModal } from './components/pos/ReceiptModal';
import { InventoryManager } from './components/inventory/InventoryManager';
const DailyReports = lazy(() =>
  import('./components/reports/DailyReports').then((m) => ({ default: m.DailyReports }))
);
import { BoothSettings } from './components/settings/BoothSettings';
import { BackupRestore } from './components/settings/BackupRestore';
import * as dbService from './services/db';
import { createBackup, downloadBackup } from './services/backupService';
import { generateEventId } from './utils/eventSession';

export default function App() {
  // Navigation tab state: 0 = Register, 1 = Inventory, 2 = Sales Reports, 3 = Settings
  const [currentTab, setCurrentTab] = useState<number>(0);

  // Core POS State — initialized empty, loaded from DB on mount
  const [products, setProducts] = useState<Product[]>([]);
  const [eventConfig, setEventConfig] = useState<EventConfig>(INITIAL_EVENT_CONFIG);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal states
  const [isQuickCustomOpen, setIsQuickCustomOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [latestReceipt, setLatestReceipt] = useState<Transaction | null>(null);

  // Audio feedback toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(eventConfig.soundEffectsEnabled ?? true);

  // Toast notification
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Footer clock (Sales/Register tab)
  const [timeStr, setTimeStr] = useState<string>('');

  // ---------------------------------------------------------------------------
  // Initial load from DB (or localStorage fallback in browser-only mode)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      // Seed DB on first run, then load all data
      await dbService.initializeDatabase();
      const [loadedProducts, loadedConfig, loadedTx, loadedCart] = await Promise.all([
        dbService.fetchProducts(),
        dbService.fetchEventConfig(),
        dbService.fetchTransactions(),
        dbService.fetchCart(),
      ]);
      if (!mounted) return;
      setProducts(loadedProducts);
      setEventConfig(loadedConfig);
      setTransactions(loadedTx);
      setCart(loadedCart);
      setSoundEnabled(loadedConfig.soundEffectsEnabled ?? true);
      setIsLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Footer clock — refresh every 10s
  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // ---------------------------------------------------------------------------
  // Persistence — write changes back to DB
  // ---------------------------------------------------------------------------

  // Cart persistence
  useEffect(() => {
    if (isLoading) return;
    dbService.saveCartItems(cart);
  }, [cart, isLoading]);

  // Event config persistence
  useEffect(() => {
    if (isLoading) return;
    dbService.saveEventConfig(eventConfig);
  }, [eventConfig, isLoading]);

  // Sync sound engine enabled state
  useEffect(() => {
    soundEngine.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEngine.setEnabled(next);
    if (next) soundEngine.playCoin();
    setEventConfig((prev) => ({ ...prev, soundEffectsEnabled: next }));
  };

  // Cart operations
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) return;

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === product.id && !item.customNote);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + 1;
        // Don't exceed available stock
        if (newQty > product.stock) {
          setToast({
            open: true,
            message: `Only ${product.stock} units available in booth stock!`,
            severity: 'warning',
          });
          return prev;
        }
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
        };
        return updated;
      } else {
        const newItem: CartItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: product.id,
          name: product.name,
          category: product.category,
          emoji: product.emoji,
          unitPrice: product.price,
          unitCost: product.cost,
          quantity: 1,
        };
        return [...prev, newItem];
      }
    });
  };

  /**
   * Global barcode-scan handling — an HID scanner "types" the code anywhere in
   * the app. Exact SKU/barcode match → add to cart. Only acts on the Register
   * tab; scans elsewhere (and into text fields) are ignored.
   */
  const handleScannedCode = (code: string) => {
    if (currentTab !== 0) return;

    const q = code.trim().toLowerCase();
    const matches = products.filter(
      (p) => p.sku.toLowerCase() === q || (p.barcode && p.barcode.toLowerCase() === q)
    );

    if (matches.length > 1) {
      soundEngine.playVoid();
      setToast({
        open: true,
        message: `Code "${code}" matches ${matches.length} products — fix the duplicate SKU/barcode.`,
        severity: 'warning',
      });
      return;
    }

    const product = matches[0];
    if (!product) {
      soundEngine.playVoid();
      setToast({ open: true, message: `No product found for scanned code "${code}".`, severity: 'warning' });
      return;
    }
    if (product.stock <= 0) {
      soundEngine.playVoid();
      setToast({ open: true, message: `${product.name} is sold out.`, severity: 'warning' });
      return;
    }

    soundEngine.playPop();
    handleAddToCart(product);
    setToast({ open: true, message: `Scanned: ${product.name} added to bag.`, severity: 'success' });
  };

  // Scanner listener — buffers rapid keystrokes fired outside text fields.
  // Scans terminate on Enter, or flush after a short pause (no-suffix scanners).
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;
    let flushTimer: number | undefined;

    const flush = () => {
      if (buffer.length >= 4) handleScannedCode(buffer);
      buffer = '';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        buffer = '';
        return;
      }

      const now = performance.now();
      if (now - lastKeyTime > 60) buffer = '';
      lastKeyTime = now;

      window.clearTimeout(flushTimer);
      if (e.key === 'Enter') {
        flush();
      } else if (e.key.length === 1) {
        buffer += e.key;
        flushTimer = window.setTimeout(flush, 120);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(flushTimer);
    };
  }, [products, currentTab]);

  const handleAddCustomCartItem = (customItem: CartItem) => {
    setCart((prev) => [...prev, customItem]);
    setToast({
      open: true,
      message: `Added custom commission: "${customItem.name}"`,
      severity: 'success',
    });
  };

  const handleUpdateQuantity = (id: string, newQty: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          // Check stock limit for catalog products
          const catalogProd = products.find((p) => p.id === item.productId);
          if (catalogProd && newQty > catalogProd.stock) {
            setToast({
              open: true,
              message: `Maximum available stock is ${catalogProd.stock} units.`,
              severity: 'warning',
            });
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const handleRemoveCartItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Complete sale transaction
  const handleCompleteSale = async (transaction: Transaction) => {
    // 1. Deduct stock in DB and get fresh product list
    const updatedProducts = await dbService.deductStock(
      transaction.items
        .filter((i) => i.productId)
        .map((i) => ({ productId: i.productId, quantity: i.quantity }))
    );
    setProducts(updatedProducts);

    // 2. Insert transaction in DB and get fresh list
    const updatedTx = await dbService.addTransaction(transaction);
    setTransactions(updatedTx);

    // 3. Clear cart
    setCart([]);

    // 4. Close checkout modal & open receipt
    setIsCheckoutOpen(false);
    setLatestReceipt(transaction);

    setToast({
      open: true,
      message: `Sale completed! Receipt #${transaction.receiptNumber}`,
      severity: 'success',
    });
  };

  // Refund / Void transaction — restockable items return to stock,
  // defective units are recorded on the product instead
  const handleRefundTransaction = async (
    transactionId: string,
    refundDetails: RefundItemDetail[],
    reason: string
  ) => {
    const targetTx = transactions.find((t) => t.id === transactionId);
    if (!targetTx || targetTx.status === 'refunded') return;

    // 1. Restock good units, record defective units in DB
    const updatedProducts = await dbService.processRefundRestock(
      refundDetails
        .filter((d) => d.productId)
        .map((d) => ({
          productId: d.productId,
          restockQty: d.quantity - d.defectiveQty,
          defectiveQty: d.defectiveQty,
        }))
    );
    setProducts(updatedProducts);

    // 2. Mark refunded with metadata in DB
    const updatedTx = await dbService.refundTransaction(transactionId, {
      refundedAt: new Date().toISOString(),
      refundReason: reason.trim(),
      refundedBy: eventConfig.cashierName,
      refundDetails,
    });
    setTransactions(updatedTx);

    const defectCount = refundDetails.reduce((s, d) => s + d.defectiveQty, 0);
    setToast({
      open: true,
      message: defectCount > 0
        ? `Receipt #${targetTx.receiptNumber} refunded — ${defectCount} defective item(s) recorded, rest returned to stock.`
        : `Receipt #${targetTx.receiptNumber} was refunded and items returned to stock.`,
      severity: 'info',
    });
  };

  // Inventory modifications
  /** Persists the product, then its photo (or removes it) per the form's flags. */
  const persistProductVisual = async (productId: string, imageBlob?: Blob | null, removeImage?: boolean) => {
    if (imageBlob) {
      await dbService.saveProductImage(productId, imageBlob);
      invalidateProductImage(productId);
    } else if (removeImage) {
      await dbService.deleteProductImage(productId);
      invalidateProductImage(productId);
    }
  };

  const handleAddProduct = async (newProduct: Product, imageBlob?: Blob | null, removeImage?: boolean) => {
    soundEngine.playPop();
    const updated = await dbService.saveProduct(newProduct);
    await persistProductVisual(newProduct.id, imageBlob, removeImage);
    setProducts(updated);
    setToast({
      open: true,
      message: `Added "${newProduct.name}" to catalogue.`,
      severity: 'success',
    });
  };

  const handleUpdateProduct = async (updated: Product, imageBlob?: Blob | null, removeImage?: boolean) => {
    soundEngine.playPop();
    const list = await dbService.saveProduct(updated);
    await persistProductVisual(updated.id, imageBlob, removeImage);
    setProducts(list);
    setToast({
      open: true,
      message: `Updated product "${updated.name}".`,
      severity: 'success',
    });
  };

  const handleDeleteProduct = async (id: string) => {
    const updated = await dbService.removeProduct(id);
    invalidateProductImage(id);
    setProducts(updated);
    setToast({
      open: true,
      message: 'Product removed from catalogue.',
      severity: 'info',
    });
  };

  /** Bulk CSV import — rows are already validated/deduped by ImportItemsModal. */
  const handleImportProducts = async (items: Product[]) => {
    soundEngine.playPop();
    const updated = await dbService.bulkSaveProducts(items);
    setProducts(updated);
    setToast({
      open: true,
      message: `Imported ${items.length} item${items.length === 1 ? '' : 's'} into the catalogue.`,
      severity: 'success',
    });
  };

  const handleBatchRestock = async (updates: { id: string; addQty: number }[]) => {
    const updated = await dbService.restockBatch(updates);
    setProducts(updated);
    const totalAdded = updates.reduce((s, u) => s + u.addQty, 0);
    setToast({
      open: true,
      message: `Successfully restocked +${totalAdded} units across ${updates.length} items!`,
      severity: 'success',
    });
  };

  // Reset to demo data
  const handleResetDemoData = async () => {
    const result = await dbService.resetDemoData();
    setProducts(result.products);
    setEventConfig(result.eventConfig);
    setTransactions(result.transactions);
    setCart([]);
    clearProductImageCache();
    setToast({
      open: true,
      message: 'All data cleared. Ready to register your real products!',
      severity: 'success',
    });
  };

  // Close Event — auto-downloads a backup, then starts a fresh event session.
  // Old transactions stay archived under the previous eventId (viewable in
  // Sales Report via the event filter); products & settings are kept.
  const handleCloseEvent = async () => {
    try {
      const backup = await createBackup();
      downloadBackup(backup, eventConfig.eventName || undefined);

      const updated = await dbService.saveEventConfig({
        ...eventConfig,
        eventId: generateEventId(),
        eventName: '',
        boothNumber: '',
        cashierName: '',
        location: '',
        startDate: '',
        endDate: '',
        openingCashFloat: 0,
      });
      setEventConfig(updated);
      setCart(await dbService.clearCartItems());

      setToast({
        open: true,
        message: 'Backup downloaded — event closed. Sales archived; new session started.',
        severity: 'success',
      });
    } catch (err) {
      console.error('[close-event] failed:', err);
      setToast({
        open: true,
        message: 'Could not close the event — nothing was changed.',
        severity: 'error',
      });
    }
  };

  // Reload all state after a backup restore
  const handleDataRestored = async () => {
    const [p, t, cfg, c] = await Promise.all([
      dbService.fetchProducts(),
      dbService.fetchTransactions(),
      dbService.fetchEventConfig(),
      dbService.fetchCart(),
    ]);
    setProducts(p);
    setTransactions(t);
    setEventConfig(cfg);
    setCart(c);
    clearProductImageCache();
  };

  const totalCartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // Loading splash
  if (isLoading) {
    return (
      <ThemeProvider theme={chibiTheme}>
        <CssBaseline />
        <div className="min-h-screen flex items-center justify-center bg-[#F4F9FE]">
          <div className="text-center">
            <div className="text-4xl font-black text-[#2D3548] mb-2 animate-pulse">🛍️ Chibishoppu</div>
            <div className="text-sm font-bold text-[#616D86]">Loading POS database…</div>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={chibiTheme}>
      <CssBaseline />
      <div className="min-h-screen flex flex-col bg-[#F4F9FE] text-[#2D3548] font-sans selection:bg-[#FFD6E8] selection:text-[#2D3548]">
        {/* Top Sticky Header */}
        <Navbar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          eventConfig={eventConfig}
          products={products}
          cartCount={totalCartCount}
        />

        {/* Main Workspace Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col">
          {/* TAB 0: POS REGISTER */}
          {currentTab === 0 && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-start min-h-[calc(100vh-160px)]">
              {/* Product Grid Area (7 cols on md, 8 cols on xl) */}
              <div className="md:col-span-7 xl:col-span-8 h-[calc(100vh-160px)] overflow-hidden flex flex-col min-w-0">
                <PosRegister
                  products={products}
                  eventConfig={eventConfig}
                  onAddToCart={handleAddToCart}
                  cart={cart}
                  onOpenQuickCustom={() => setIsQuickCustomOpen(true)}
                />
              </div>

              {/* Basket / Cart Side Panel (5 cols on md, 4 cols on xl) */}
              <div className="md:col-span-5 xl:col-span-4 h-[calc(100vh-160px)] sticky top-32 lg:top-24">
                <CartPanel
                  cart={cart}
                  eventConfig={eventConfig}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveCartItem}
                  onClearCart={handleClearCart}
                  onOpenQuickCustom={() => setIsQuickCustomOpen(true)}
                  onOpenCheckout={() => setIsCheckoutOpen(true)}
                />
              </div>
            </div>
          )}

          {/* TAB 1: INVENTORY MANAGEMENT */}
          {currentTab === 1 && (
            <Container maxWidth="xl" sx={{ p: 0 }}>
              <InventoryManager
                products={products}
                eventConfig={eventConfig}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onImportProducts={handleImportProducts}
                onBatchRestock={handleBatchRestock}
              />
            </Container>
          )}

          {/* TAB 2: DAILY SALES REPORTS & ANALYTICS */}
          {currentTab === 2 && (
            <Container maxWidth="xl" sx={{ p: 0 }}>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="text-3xl mb-2 animate-pulse">📊</div>
                      <div className="text-sm font-bold text-[#616D86]">Loading reports…</div>
                    </div>
                  </div>
                }
              >
                <DailyReports
                  transactions={transactions}
                  eventConfig={eventConfig}
                  onRefundTransaction={handleRefundTransaction}
                />
              </Suspense>
            </Container>
          )}

          {/* TAB 3: EVENT & BOOTH SETTINGS */}
          {currentTab === 3 && (
            <Container maxWidth="lg" sx={{ p: 0 }}>
              <BoothSettings
                eventConfig={eventConfig}
                currentEventTxCount={
                  transactions.filter((t) => (t.eventId ?? eventConfig.eventId) === eventConfig.eventId).length
                }
                onUpdateEventConfig={setEventConfig}
                onResetDemoData={handleResetDemoData}
                onCloseEvent={handleCloseEvent}
              />
              <BackupRestore
                onNotify={(message, severity) => setToast({ open: true, message, severity })}
                onRestored={handleDataRestored}
              />
            </Container>
          )}
        </main>

        {/* Artistic Flair Footer Bar */}
        <footer className="h-10 bg-[#2D3548] text-white flex items-center px-4 sm:px-8 justify-between text-[10px] sm:text-xs font-black uppercase tracking-widest select-none border-t-2 border-[#2D3548]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 shrink-0 rounded-full bg-[#A3E7D0] inline-block animate-pulse"></span>
            <span className="truncate">SYSTEM: ONLINE • CONVENTION: {eventConfig.eventName.toUpperCase()}</span>
            {currentTab === 0 && <span className="text-[#FFE680] shrink-0">{timeStr}</span>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Audio Toggle */}
            <button
              onClick={handleToggleSound}
              title={soundEnabled ? 'Mute Sound Effects' : 'Enable Kawaii Audio Chimes'}
              className="w-7 h-7 rounded-lg border border-white/50 bg-white/10 text-white flex items-center justify-center hover:bg-white/25 transition-all"
            >
              {soundEnabled ? <SoundOnIcon sx={{ fontSize: 15 }} /> : <SoundOffIcon sx={{ fontSize: 15 }} />}
            </button>

            {/* Cashier Staff Badge */}
            <div
              title={`Active Cashier: ${eventConfig.cashierName}`}
              className="w-7 h-7 bg-[#D8EDFC] rounded-full border border-white flex items-center justify-center font-black text-[10px] text-[#2D3548] select-none"
            >
              {eventConfig.cashierName.slice(0, 2).toUpperCase() || 'CP'}
            </div>

            <div className="hidden sm:block text-slate-300">
              v{__APP_VERSION__} • BUILD {__BUILD_TIME__.slice(0, 10)} • © CHIBISHOPPU
            </div>
          </div>
        </footer>

        {/* Global Modals */}
        <QuickCustomItemModal
          open={isQuickCustomOpen}
          onClose={() => setIsQuickCustomOpen(false)}
          onAddCustomItem={handleAddCustomCartItem}
          currencySymbol={eventConfig.currencySymbol}
        />

        <CheckoutModal
          open={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          cart={cart}
          eventConfig={eventConfig}
          onCompleteSale={handleCompleteSale}
        />

        <ReceiptModal
          open={Boolean(latestReceipt)}
          onClose={() => setLatestReceipt(null)}
          transaction={latestReceipt}
          eventConfig={eventConfig}
        />

        {/* Global Toast */}
        <Snackbar
          open={toast.open}
          autoHideDuration={3500}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity={toast.severity}
            onClose={() => setToast((prev) => ({ ...prev, open: false }))}
            sx={{
              borderRadius: 3,
              fontWeight: 800,
              border: '2px solid #2D3548',
              boxShadow: '4px 4px 0px #2D3548',
              bgcolor: '#FFFFFF',
              color: '#2D3548',
            }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      </div>
    </ThemeProvider>
  );
}
