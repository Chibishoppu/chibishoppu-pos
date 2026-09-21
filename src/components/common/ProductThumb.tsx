import React from 'react';
import { useProductImage } from '../../hooks/useProductImage';

interface ProductThumbProps {
  productId: string;
  emoji: string;
  /** Classes applied to the <img> when a photo exists */
  imgClassName?: string;
  /** Classes applied to the emoji fallback <span> */
  emojiClassName?: string;
}

/**
 * Product visual: stored photo if one exists, emoji mascot otherwise.
 */
export const ProductThumb: React.FC<ProductThumbProps> = ({
  productId,
  emoji,
  imgClassName = 'w-full h-full object-cover',
  emojiClassName = 'text-3xl',
}) => {
  const url = useProductImage(productId);

  if (url) {
    return <img src={url} alt="" className={imgClassName} loading="lazy" />;
  }
  return <span className={emojiClassName}>{emoji}</span>;
};
