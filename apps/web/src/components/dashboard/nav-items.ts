import {
  House,
  CreditCard,
  ClipboardList,
  Network,
  Smartphone,
  BarChart3,
  AtSign,
  MessageCircleQuestion,
  CircleUser,
  Bell,
  LayoutGrid,
  Users,
  Plug,
  Megaphone,
  Tag,
  Banknote,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { ADMIN_ROLES, SUBADMIN_ROLES, type UserRole } from '@/lib/types';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Optional badge count shown as a pill on the nav item (0 hides the badge). */
  badge?: number;
  /** If set, the item is only rendered for these roles. */
  roles?: UserRole[];
}

/** Primary navigation — single source of truth for sidebar, bottom bar, and page titles. */
export const navigation: NavItem[] = [
  { name: 'Home',     href: '/home',    icon: House },
  { name: 'Wallet',   href: '/wallet',  icon: CreditCard },
  { name: 'Orders',   href: '/orders',  icon: ClipboardList },
  { name: 'Proxy',    href: '/proxy',   icon: Network },
  { name: 'Numbers',  href: '/numbers', icon: Smartphone },
  { name: 'Email',    href: '/email',   icon: AtSign },
  { name: 'Support',       href: '/support',        icon: MessageCircleQuestion },
  { name: 'Notifications', href: '/notifications',   icon: Bell },
  { name: 'Account',       href: '/account',         icon: CircleUser },
];

/**
 * Back-office navigation.
 * Full admins see everything; scoped sub-admin roles (SUPPORT / FINANCE)
 * only see sections they are authorised for.
 */
export const adminNavigation: NavItem[] = [
  { name: 'Overview',      href: '/admin',              icon: LayoutGrid,           roles: [...ADMIN_ROLES, 'FINANCE'] },
  { name: 'Orders',        href: '/admin/orders',       icon: ClipboardList,        roles: [...ADMIN_ROLES, 'SUPPORT', 'FINANCE'] },
  { name: 'Users',         href: '/admin/users',        icon: Users,                roles: [...ADMIN_ROLES, 'SUPPORT'] },
  { name: 'Tickets',       href: '/admin/tickets',      icon: MessageCircleQuestion, roles: [...ADMIN_ROLES, 'SUPPORT'] },
  { name: 'Providers',     href: '/admin/providers',    icon: Plug,                 roles: ADMIN_ROLES },
  { name: 'Announcements', href: '/admin/announcements', icon: Megaphone,           roles: ADMIN_ROLES },
  { name: 'Pricing',       href: '/admin/pricing',      icon: Tag,                  roles: ADMIN_ROLES },
  { name: 'Deposits',      href: '/admin/deposits',     icon: Banknote,             roles: [...ADMIN_ROLES, 'FINANCE'] },
  { name: 'Audit Logs',    href: '/admin/audit-logs',   icon: ShieldCheck,          roles: ADMIN_ROLES },
];

/** Filter a nav list down to entries visible for `role`. */
export function navForRole(items: NavItem[], role?: string | null): NavItem[] {
  if (!role) return items.filter((item) => !item.roles);
  return items.filter((item) => !item.roles || item.roles.includes(role as UserRole));
}

/** True when the role can reach the back office at all. */
export function canAccessAdmin(role?: string | null): boolean {
  if (!role) return false;
  return [...ADMIN_ROLES, ...SUBADMIN_ROLES].includes(role as UserRole);
}

/** Returns the display title for the current pathname. */
export function titleForPath(pathname: string): string {
  const all = [...navigation, ...adminNavigation];
  const match = all
    .filter((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.name ?? 'Dashboard';
}
