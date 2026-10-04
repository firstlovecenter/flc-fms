export type PublicNavPage =
  | "home"
  | "guest"
  | "checkin"
  | "patron"
  | "weddings"
  | "namings"
  | "catalog"
  | "faq"
  | "feedback";

export type PublicNavLeaf = {
  href: string;
  id: PublicNavPage;
  label: string;
  /** Shown under the label inside the Experiences dropdown. */
  description?: string;
};

export type PublicNavNode =
  | ({ kind: "link" } & PublicNavLeaf)
  | { kind: "group"; key: string; label: string; items: PublicNavLeaf[] };

/**
 * Visitor navigation follows anagkazo-campus.com: a short set of
 * uppercase, service-led entries with everything bookable gathered under
 * Experiences. Operational language stays out of visitor surfaces —
 * feedback lives in the footer and mobile drawer.
 */
export const PUBLIC_NAV: PublicNavNode[] = [
  { kind: "link", href: "/", id: "home", label: "Host with us" },
  {
    kind: "group",
    key: "experiences",
    label: "Experiences",
    items: [
      {
        href: "/catalog?vtype=wedding",
        id: "weddings",
        label: "Weddings",
        description: "Venues set aside for the day",
      },
      {
        href: "/catalog?vtype=naming",
        id: "namings",
        label: "Namings",
        description: "Dedications and naming ceremonies",
      },
      {
        href: "/catalog?tab=packages",
        id: "catalog",
        label: "Packages",
        description: "Everything for one kind of gathering",
      },
      {
        href: "/catalog?tab=items",
        id: "catalog",
        label: "Items to hire",
        description: "Chairs, canopies, sound and more",
      },
    ],
  },
  { kind: "link", href: "/guest/checkin", id: "checkin", label: "Check in" },
  { kind: "link", href: "/faq", id: "faq", label: "Contact us" },
];
