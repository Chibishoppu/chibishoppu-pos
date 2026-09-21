import { Transaction, Product, EventConfig } from '../types';

export function formatCurrency(amount: number, symbol: string = 'RM'): string {
  return `${symbol}${amount.toFixed(2)}`;
}

export function generateReceiptNumber(): string {
  const date = new Date();
  const yymmdd = date.toISOString().slice(2, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `CHIBI-${yymmdd}-${randomSuffix}`;
}

export function exportTransactionsToCSV(transactions: Transaction[], eventConfig: EventConfig) {
  const headers = [
    'Receipt No',
    'Date Time',
    'Event',
    'Booth',
    'Payment Method',
    'Items Count',
    'Items Breakdown',
    'Subtotal',
    'Discount Amount',
    'Tax',
    'Total Revenue',
    'Estimated COGS',
    'Net Profit',
    'Status',
    'Refunded At',
    'Refunded By',
    'Refund Reason',
    'Defective Units'
  ];

  const rows = transactions.map(t => {
    const itemsSummary = t.items.map(i => `${i.name} (x${i.quantity})`).join('; ');
    const defectiveUnits = t.refundDetails?.reduce((s, d) => s + d.defectiveQty, 0) ?? 0;
    return [
      `"${t.receiptNumber}"`,
      `"${new Date(t.timestamp).toLocaleString()}"`,
      `"${t.eventName}"`,
      `"${t.boothNumber}"`,
      `"${t.paymentMethod.toUpperCase()}"`,
      t.items.reduce((acc, curr) => acc + curr.quantity, 0),
      `"${itemsSummary.replace(/"/g, '""')}"`,
      t.subtotal.toFixed(2),
      t.discountAmount.toFixed(2),
      t.taxAmount.toFixed(2),
      t.total.toFixed(2),
      t.totalCost.toFixed(2),
      t.netProfit.toFixed(2),
      `"${t.status}"`,
      `"${t.refundedAt ? new Date(t.refundedAt).toLocaleString() : ''}"`,
      `"${(t.refundedBy ?? '').replace(/"/g, '""')}"`,
      `"${(t.refundReason ?? '').replace(/"/g, '""')}"`,
      t.status === 'refunded' ? defectiveUnits : ''
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `chibishoppu_sales_${eventConfig.eventName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportInventoryToCSV(products: Product[]) {
  const headers = [
    'SKU',
    'Barcode',
    'Product Name',
    'Category',
    'Selling Price',
    'Cost Price',
    'Stock Qty',
    'Defective Qty',
    'Low Stock Alert Level',
    'Potential Gross Value',
    'Inventory Cost Value',
    'Tags',
    'Emoji',
    'Description'
  ];

  const rows = products.map(p => [
    `"${p.sku}"`,
    `"${p.barcode ?? ''}"`,
    `"${p.name.replace(/"/g, '""')}"`,
    `"${p.category}"`,
    p.price.toFixed(2),
    p.cost.toFixed(2),
    p.stock,
    p.defectiveStock ?? 0,
    p.lowStockThreshold,
    (p.price * p.stock).toFixed(2),
    (p.cost * p.stock).toFixed(2),
    `"${p.tags.join(', ')}"`,
    `"${p.emoji}"`,
    `"${(p.description ?? '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `chibishoppu_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
