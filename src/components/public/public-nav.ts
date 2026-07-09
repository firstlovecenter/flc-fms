export type PublicNavPage =
  | "home"
  | "guest"
  | "checkin"
  | "patron"
  | "weddings"
  | "namings"
  | "catalog"
  | "ceremony-request"
  | "faq";

export const PUBLIC_NAV_ITEMS: { href: string; id: PublicNavPage; label: string }[] = [
  { href: "/", id: "home", label: "Home" },
  { href: "/guest/book", id: "guest", label: "Guest Booking" },
  { href: "/guest/checkin", id: "checkin", label: "Check-In" },
  { href: "/?vtype=wedding", id: "weddings", label: "Weddings" },
  { href: "/?vtype=naming", id: "namings", label: "Namings" },
  { href: "/ceremony-code-request", id: "ceremony-request", label: "Get a Ceremony Code" },
];
