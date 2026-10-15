import { useRef } from 'react';

/**
 * Toque corto → onTap; mantener apretado (~0,45 s) → onLongPress.
 * Para el + y − de las cantidades: un toque suma uno, mantener abre el selector.
 */
export function useLongPress(onTap: () => void, onLongPress: () => void, ms = 450) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const fired = useRef(false);
  const clear = () => clearTimeout(timer.current);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      e.stopPropagation(); // que no empiece a deslizar la fila
      fired.current = false;
      timer.current = setTimeout(() => {
        fired.current = true;
        onLongPress();
      }, ms);
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClick: () => {
      if (!fired.current) onTap();
    },
  };
}
