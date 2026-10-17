// Íconos de línea finos (lucide), trazo 1.75 para una estética sobria.
import {
  Apple, Archive, Image as ImageIcon, BadgePercent, Store, Tag, BarChart3, Camera, Barcode, ReceiptText, Mic, Baby, Bath, Beef, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CloudOff,
  CookingPot, Copy, Croissant, CupSoda, Fish, House, Leaf, Milk, Minus, Package, PawPrint, Pencil, Plus,
  Refrigerator, RefreshCw, ScanBarcode, Search, Settings, Share, ShoppingBasket, Snowflake, Soup, SprayCan,
  Star, Trash2, Undo2, Wheat, X, Bell, ChartLine, TrendingUp, Split, type LucideIcon,
} from 'lucide-react';
import type { SVGProps } from 'react';

const icons = {
  home: House,
  box: Package,
  cart: ShoppingBasket,
  pot: CookingPot,
  plus: Plus,
  minus: Minus,
  search: Search,
  scan: ScanBarcode,
  gear: Settings,
  check: Check,
  x: X,
  chevron: ChevronRight,
  back: ChevronLeft,
  trash: Trash2,
  star: Star,
  share: Share,
  cloudOff: CloudOff,
  sync: RefreshCw,
  undo: Undo2,
  edit: Pencil,
  copy: Copy,
  up: ChevronUp,
  down: ChevronDown,
  // Categorías y lugares
  apple: Apple,
  bread: Croissant,
  meat: Beef,
  fish: Fish,
  milk: Milk,
  wheat: Wheat,
  snow: Snowflake,
  drink: CupSoda,
  spray: SprayCan,
  bath: Bath,
  baby: Baby,
  paw: PawPrint,
  soup: Soup,
  fridge: Refrigerator,
  shelf: Archive,
  leaf: Leaf,
  camera: Camera,
  barcode: Barcode,
  receipt: ReceiptText,
  mic: Mic,
  chart: BarChart3,
  tag: Tag,
  percent: BadgePercent,
  store: Store,
  image: ImageIcon,
  bell: Bell,
  history: ChartLine,
  trend: TrendingUp,
  split: Split,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export function Icon({
  name, size = 22, strokeWidth = 1.75, ...rest
}: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  const C = icons[name];
  return <C size={size} strokeWidth={strokeWidth} aria-hidden="true" {...(rest as object)} />;
}
