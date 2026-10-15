import type { Product } from '../domain/types';
import { categoryIcon } from '../lib/categoryIcon';
import { useImageUrl } from '../lib/images';
import { Icon } from './Icon';

/**
 * Miniatura del producto: la foto propia (recortada sin fondo) si existe, si no la de
 * Open Food Facts, y si no, un ícono de línea de su categoría.
 */
export function ProductThumb({
  product, categoryName, size = 'md',
}: { product: Pick<Product, 'image_url' | 'image_path' | 'name'>; categoryName?: string; size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'sm' ? 'h-9 w-9 rounded-lg' : size === 'lg' ? 'h-24 w-24 rounded-2xl' : 'h-11 w-11 rounded-xl';
  const own = useImageUrl(product.image_path);
  const src = own ?? product.image_url;
  if (src) {
    const transparent = Boolean(own && product.image_path?.endsWith('.png'));
    return (
      <span className={`flex shrink-0 items-center justify-center overflow-hidden bg-sunken/60 ${box}`}>
        <img
          src={src}
          alt=""
          loading="lazy"
          className={transparent ? 'h-[88%] w-[88%] object-contain' : 'h-full w-full object-cover'}
        />
      </span>
    );
  }
  return (
    <span className={`flex shrink-0 items-center justify-center bg-sunken/60 text-muted ${box}`} aria-hidden>
      <Icon name={categoryIcon(categoryName)} size={size === 'sm' ? 18 : size === 'lg' ? 34 : 20} strokeWidth={1.5} />
    </span>
  );
}
