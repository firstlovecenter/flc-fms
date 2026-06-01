export type PublicNavPage =
  | "home"
  | "guest"
  | "checkin"
  | "patron"
  | "weddings"
  | "namings"
  | "catalog"
  | "ceremony-request";

export const PUBLIC_NAV_ITEMS: { href: string; id: PublicNavPage; label: string }[] = [
  { href: "/", id: "home", label: "Home" },
  { href: "/guest/book", id: "guest", label: "Guest Booking" },
  { href: "/guest/checkin", id: "checkin", label: "Check-In" },
  { href: "/catalog/weddings", id: "weddings", label: "Weddings" },
  { href: "/catalog/namings", id: "namings", label: "Namings" },
];
