import { createContext, useContext } from 'react';

export interface AddDefaults {
  name?: string;
  category_id?: string | null;
  location_id?: string | null;
  status?: 'ok' | 'low' | 'out';
}

export interface UI {
  openProduct: (id: string) => void;
  openAdd: (defaults?: AddDefaults) => void;
  openRanOut: () => void;
}

export const UIContext = createContext<UI>({
  openProduct: () => {},
  openAdd: () => {},
  openRanOut: () => {},
});

export const useUI = () => useContext(UIContext);
