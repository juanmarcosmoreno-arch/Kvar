import { useEffect, useRef } from 'react';
import { itemName } from '../domain/shoppingList';
import type { Snapshot } from '../domain/types';
import { m } from '../i18n';
import { useListOrder } from '../lib/listOrder';
import { usePresence } from '../lib/presence';
import { showListActivity } from '../lib/watch';

/**
 * Con «Estoy en el súper» prendido, la lista queda en la pantalla bloqueada y en la Dynamic Island (lo próximo
 * a agarrar, en el orden del súper, y cuántas cosas faltan). Al tocar «Ya salí del súper» se cierra.
 */
export function ListActivitySync({ view }: { view: Snapshot }) {
  const { me } = usePresence();
  const { groups } = useListOrder(view);
  const since = useRef<number | null>(null);

  useEffect(() => {
    if (!me) {
      since.current = null;
      showListActivity(null);
      return;
    }
    since.current ??= Date.now();
    const byId = new Map(view.products.map((p) => [p.id, p]));
    const open = groups.flatMap((g) => g.items);
    const done = view.list.filter((i) => i.checked_at && Date.parse(i.checked_at) >= since.current! - 60_000).length;
    const t = m.shopping.live;
    showListActivity({
      active: true,
      title: t.title(view.household.name),
      subtitle: done ? `${t.left(open.length)} · ${t.inCart(done)}` : t.left(open.length),
      items: open.slice(0, 4).map((i) => itemName(i, byId)),
      left: open.length,
      done,
    });
  }, [me, groups, view.list, view.products, view.household.name]);

  return null;
}
