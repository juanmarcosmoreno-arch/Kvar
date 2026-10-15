// Íconos de línea simples, trazo redondeado (estilo de la guía).
import type { SVGProps } from 'react';

const paths = {
  home: 'M4 11.5 12 5l8 6.5M6.5 10v9h11v-9M10 19v-5h4v5',
  box: 'M5 8.5 12 5l7 3.5v8L12 20l-7-3.5v-8ZM5 8.5l7 3.5 7-3.5M12 12v8',
  cart: 'M3.5 5h2l2.2 10h10l2-7H7M10 19.5h.01M17 19.5h.01',
  pot: 'M4 11h16M5.5 11v6a2.5 2.5 0 0 0 2.5 2.5h8a2.5 2.5 0 0 0 2.5-2.5v-6M9 7.5c0-1 .8-1.5.8-2.5M12.5 7.5c0-1 .8-1.5.8-2.5M2.5 11h2M19.5 11h2',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  scan: 'M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M8 9v6M11 9v6M14 9v6M17 9v6',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.4-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z',
  check: 'M5 12.5 10 17l9-10',
  x: 'M6 6l12 12M18 6 6 18',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12',
  star: 'M12 4.5l2.3 4.7 5.2.8-3.8 3.6.9 5.2-4.6-2.4-4.6 2.4.9-5.2L4.5 10l5.2-.8L12 4.5Z',
  share: 'M12 15V4M8 8l4-4 4 4M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13',
  cloudOff: 'M4 4l16 16M8 8a5 5 0 0 0-1 9.9h9.5M17.5 16a3.5 3.5 0 0 0-2-6.4A5 5 0 0 0 10.5 6',
  sync: 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 24, strokeWidth = 2, ...rest }: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={name === 'star' && rest.fill ? rest.fill : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={paths[name]} />
    </svg>
  );
}
