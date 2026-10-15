import { createContext, useContext } from 'react';
import type { QuantityMode } from '../domain/quantity';

export interface AddDefaults {
  name?: string;
  category_id?: string | null;
  location_id?: string | null;
  status?: 'ok' | 'low' | 'out';
  /** Alta desde un escaneo: el código se aprende al guardar */
  barcode?: string;
  brand?: string | null;
  image_url?: string | null;
  /** Qué hacer si el usuario elige un producto existente: marcarlo como terminado o como comprado */
  then?: 'out' | 'bought' | null;
}

/**
 * Modos del escáner:
 * - ask: muestra el producto y pregunta «Se terminó» / «Compré»
 * - out: un envase vacío → No hay, directo
 * - bought: volviste del súper → cada código escaneado pasa a Hay, la cámara sigue abierta
 * - link: vincular un código a un producto existente
 */
export type ScanMode = 'ask' | 'out' | 'bought' | 'link';

export interface UI {
  openProduct: (id: string) => void;
  openAdd: (defaults?: AddDefaults) => void;
  openRanOut: () => void;
  openScan: (mode: ScanMode, productId?: string) => void;
  /** Selector de cantidad: sumar, restar, fijar, «¿cuántos compraste?» o «¿cuántos comprar?» */
  openQuantity: (productId: string, mode: QuantityMode) => void;
  openReceipt: () => void;
}

export const UIContext = createContext<UI>({
  openProduct: () => {},
  openAdd: () => {},
  openRanOut: () => {},
  openScan: () => {},
  openQuantity: () => {},
  openReceipt: () => {},
});

export const useUI = () => useContext(UIContext);
