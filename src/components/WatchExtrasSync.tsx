import { useEffect, useMemo } from 'react';
import { learnAisleOrder, MIN_TRIPS } from '../domain/aisleOrder';
import type { Snapshot } from '../domain/types';
import { useEvents } from '../lib/stats';
import { useListOrderMode } from '../lib/listOrder';
import { useTickMode } from '../lib/tickMode';
import { setWatchExtras } from '../lib/watch';

/** Le pasa al Apple Watch qué hacer al tachar, el recorrido del súper y el orden de la lista (para verla igual que acá). */
export function WatchExtrasSync({ view }: { view: Snapshot }) {
  const tickMode = useTickMode();
  const listOrder = useListOrderMode();
  const events = useEvents(view.household.id);
  const aisle = useMemo(() => {
    if (events.status !== 'ready') return null;
    const order = learnAisleOrder(events.events, view.products);
    if (order.trips < MIN_TRIPS) return {};
    const out: Record<string, number> = {};
    for (const [id, pos] of order.product) out[`p:${id}`] = Math.round(pos * 1000) / 1000;
    for (const [id, pos] of order.category) out[`c:${id}`] = Math.round(pos * 1000) / 1000;
    return out;
  }, [events, view.products]);

  useEffect(() => {
    if (aisle) setWatchExtras({ tickMode, aisle, listOrder });
  }, [tickMode, aisle, listOrder]);

  return null;
}
