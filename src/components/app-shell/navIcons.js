import {
  Car,
  ClipboardCheck,
  ClipboardList,
  FileSearch,
  ShieldCheck,
  HelpCircle,
  Handshake,
  Inbox,
  ScrollText,
} from "lucide-react";

export const navIcons = {
  Car,
  ClipboardCheck,
  ClipboardList,
  FileSearch,
  ShieldCheck,
  HelpCircle,
  Handshake,
  Inbox,
  ScrollText,
};

/** A tile is active on its own page and the pages under it. */
export function isNavItemActive(item, pathname) {
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
