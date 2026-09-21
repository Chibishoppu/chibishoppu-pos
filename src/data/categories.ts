import { ProductCategory } from '../types';

interface CategoryMeta {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  cardBg: string;
  desc: string;
}

export const CATEGORY_META: Record<ProductCategory, CategoryMeta> = {
  keychain: {
    label: 'Keychains',
    emoji: '🌸',
    color: '#FF85A1',
    bgColor: '#FFF0F5',
    borderColor: '#2D3548',
    cardBg: '#FFD6E8',
    desc: 'Handmade resin, beaded & acrylic charms',
  },
  pokemon_tcg: {
    label: 'TCG Card',
    emoji: '🎴',
    color: '#D97706',
    bgColor: '#FFFDF0',
    borderColor: '#2D3548',
    cardBg: '#FFF0A6',
    desc: 'Authentic JP Booster packs & singles',
  },
  card_holder: {
    label: 'Card Holders',
    emoji: '💳',
    color: '#4A7AA7',
    bgColor: '#F0F8FF',
    borderColor: '#2D3548',
    cardBg: '#D8EDFC',
    desc: 'Decoden whip toploaders & magnetic frames',
  },
  accessories: {
    label: 'Stickers & Pins',
    emoji: '🍃',
    color: '#059669',
    bgColor: '#F0FDF8',
    borderColor: '#2D3548',
    cardBg: '#C2F0E0',
    desc: 'Sticker sheets, pins & deco parts',
  },
  custom_bundle: {
    label: 'Event Bundles',
    emoji: '🍡',
    color: '#7C3AED',
    bgColor: '#F8F5FF',
    borderColor: '#2D3548',
    cardBg: '#E0D7FE',
    desc: 'Special booth value packs & sets',
  },
  binders: {
    label: 'Binders',
    emoji: '📒',
    color: '#0E7490',
    bgColor: '#ECFEFF',
    borderColor: '#2D3548',
    cardBg: '#CFFAFE',
    desc: 'Card binders & storage albums',
  },
  others: {
    label: 'Others',
    emoji: '✨',
    color: '#6B7280',
    bgColor: '#F9FAFB',
    borderColor: '#2D3548',
    cardBg: '#E5E7EB',
    desc: 'Miscellaneous items',
  },
};
