import type { Product } from '../domain/types';
import { categoryIcon } from '../lib/categoryIcon';
import { Icon } from './Icon';

/**
 * Miniatura del producto: la foto recortada sin fondo si existe (products.image_url),
 * si no, un ícono de línea de su categoría.
 */
export function ProductThumb({
  product, categoryName, size = 'md',
}: { product: Pick<Product, 'image_url' | 'name'>; categoryName?: string; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-9 w-9 rounded-lg' : 'h-11 w-11 rounded-xl';
  if (product.image_url) {
    return (
      <span className={`flex shrink-0 items-center justify-center bg-sunken/60 ${box}`}>
        <img src={product.image_url} alt="" loading="lazy" className="h-[85%] w-[85%] object-contain" />
      </span>
    );
  }
  return (
    <span className={`flex shrink-0 items-center justify-center bg-sunken/60 text-muted ${box}`} aria-hidden>
      <Icon name={categoryIcon(categoryName)} size={size === 'sm' ? 18 : 20} strokeWidth={1.5} />
    </span>
  );
}
