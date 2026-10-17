import { useEffect } from 'react';
import type { Snapshot } from '../domain/types';
import { usePricePrefs } from '../lib/pricePrefs';
import { alertHits, notifyHits, usePriceAlerts } from '../lib/priceAlerts';
import { dayOf, recordSnapshot, seedDemoHistory } from '../lib/priceHistory';
import { useSipc } from '../lib/sipc';

/**
 * Cada vez que llegan los precios de hoy (al abrir la app, si hay súper elegidos): se guardan en el historial y se
 * revisan las alertas de precio.
 */
export function PriceWatch({ view }: { view: Snapshot }) {
  const sipc = useSipc(view.products);
  const alerts = usePriceAlerts();
  const prefs = usePricePrefs();
  const at = sipc.data?.at;

  useEffect(() => {
    if (!sipc.data) return;
    void seedDemoHistory(sipc.data).then(() => recordSnapshot(sipc.data!));
  }, [at]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sipc.data || !alerts.length) return;
    void notifyHits(alertHits(alerts, sipc.data, prefs.discounts), dayOf(sipc.data.at));
  }, [at, alerts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
