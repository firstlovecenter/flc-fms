export type BookingTermItem = {
  title: string;
  body?: string;
  bullets?: string[];
};

export type BookingFaqItem = {
  question: string;
  answer: string;
};

export type BookingContentPayload = {
  bookingTermsTitle: string;
  bookingTermsIntro: string;
  bookingTerms: BookingTermItem[];
  bookingFaqTitle: string;
  bookingFaq: BookingFaqItem[];
  itemTermsTitle: string;
  itemTermsIntro: string;
  itemTerms: string[];
};

export const DEFAULT_BOOKING_CONTENT: BookingContentPayload = {
  bookingTermsTitle: "Booking Terms and Conditions",
  bookingTermsIntro:
    "By proceeding with a booking on this platform, you acknowledge that you have read, understood, and agreed to the following Terms and Conditions governing the use of the spaces and equipment.",
  bookingTerms: [
    {
      title: "Acceptance of Terms",
      body: "All bookings are subject to these Terms and Conditions. Booking confirmation is conditional upon your agreement to comply fully with all guidelines stated herein.",
    },
    {
      title: "Mandatory Sign-In",
      body: "Users must sign in before accessing or using the space through the official sign-in link provided. Failure to sign in will be treated as unauthorized use.",
    },
    {
      title: "Cleaning Obligations (Mandatory After Every Meeting)",
      body: "The booking group bears full responsibility for ensuring the space is thoroughly cleaned after use.",
      bullets: [
        "All chairs must be neatly rearranged in their original order and position.",
        "All tables must be wiped clean.",
        "Floors must be swept and mopped.",
        "All visible dirt, crumbs, and debris must be removed.",
        "Any spills must be cleaned immediately.",
        "No water, drinks, food, or liquids should be left on the floor, chairs, or tables.",
        "Chairs must be free of stains or spills.",
        "No bottles, cans, food wrappers, tissues, rubbers, or personal items should be left behind.",
        "All waste must be disposed of in designated bins.",
        "Cleaning tools must be returned to their designated location behind Benson Idahosa Chapel after use.",
      ],
    },
    {
      title: "Shared or Private Use (Second Floor / Auditorium)",
      body: "Booking groups may choose to share the space with another group or keep it private. Where the space is shared, all groups must mutually agree on cleaning arrangements that comply with the stated cleaning standards. The group that completes the booking on this platform remains the officially responsible party. Any complaints, damage, or breaches will be addressed to the booking group. If the space is left unclean after use, the booking group will be fined, regardless of whether the space was shared.",
    },
    {
      title: "Non-Transferability of Bookings",
      body: "Bookings may not be transferred to another group without prior notification and approval from the Front Office.",
    },
    {
      title: "Mandatory Sign-Out",
      body: "Users must sign out after their meeting using the official sign-out link provided.",
    },
    {
      title: "Air Conditioner Usage (Optional)",
      body: "AC usage attracts additional fees: Chapels GHS 100 per hour, Glass Offices GHS 50 per hour. Payment must be made in physical cash to the Front Office before the meeting begins. Unauthorized use of AC units is prohibited.",
    },
    {
      title: "Locking, Inspection, and Evidence of Cleaning",
      body: "At the end of the meeting, the space must be properly locked. Where physical inspection is possible, the Front Office must be notified before key return. Where immediate inspection is not possible, clear photographic evidence of the cleaned space is required, showing chairs arranged, floors swept and mopped, tables clean, and satisfactory condition. Evidence must be submitted through +233 53 845 1046 or presented upon request.",
    },
    {
      title: "Key Return and Conditional Approval",
      body: "Keys should be returned after submission of photographic evidence or physical inspection by the Front Office. Submission of photographs does not waive the Front Office right to inspect later. If subsequent inspection or review shows inadequate or misrepresented cleaning, the booking group remains liable and subject to fines.",
    },
    {
      title: "Equipment Issued by the Front Office",
      body: "Any issued equipment (including microphones, fenders, or other items) must be returned in good condition and must never be left unattended at the Front Office door, including when closed. Return strictly by Front Office instructions.",
    },
    {
      title: "Liability for Loss or Damage",
      body: "The booking group is responsible for the cost of lost, damaged, or mishandled keys, equipment, or property.",
    },
    {
      title: "General Conduct",
      body: "All users are expected to act responsibly and preserve cleanliness, safety, order, and sanctity of the space at all times.",
    },
    {
      title: "Fines and Enforcement",
      body: "Failure to comply with these terms attracts a fine of GHS 500 or higher, depending on the space and severity of breach.",
    },
    {
      title: "Right to Refuse Booking",
      body: "If you are unable or unwilling to comply with these terms, do not proceed with the booking.",
    },
  ],
  bookingFaqTitle: "Booking FAQs",
  bookingFaq: [
    {
      question: "How do I receive access to the space I booked?",
      answer:
        "For Glass Offices or Second Floor bookings, an access code is sent one hour before booking via provided contact details.",
    },
    {
      question: "How can I communicate with the Front Office?",
      answer:
        "Strictly via email: frontofficefirstlove@gmail.com. Walk-ins, calls, or messages on other platforms are not attended to.",
    },
    {
      question: "What do the weekday time slots mean?",
      answer:
        "On weekdays: 6:00 PM booking means 6:00 PM to 10:00 PM (fellowship meetings), and 10:00 PM booking means 10:00 PM to 4:00 AM (all-night services).",
    },
    {
      question: "Can I book for multiple weeks or a future date?",
      answer: "No. Bookings are taken weekly for the current available week only.",
    },
    {
      question: "Can I change or transfer my booking to another group?",
      answer: "No, not without prior Front Office approval.",
    },
    {
      question: "What happens if the space is not cleaned properly after use?",
      answer:
        "The booking group remains responsible and may receive a fine of GHS 500 or more.",
    },
    {
      question: "What if Front Office is not available to inspect after meeting?",
      answer:
        "Take clear photos showing proper cleaning and restoration; keep for Front Office request.",
    },
    {
      question: "Is there a cost for using chapels, glass offices, second floor, or Engedi?",
      answer:
        "Spaces are free for meetings and fellowships. AC usage is paid in cash before meeting: Chapels GHS 100/hour, Glass Offices GHS 50/hour.",
    },
    {
      question: "When should I expect booking confirmation?",
      answer: "After completing booking and agreeing to these terms.",
    },
    {
      question: "What if I made a wrong booking or need to cancel?",
      answer: "Email the Front Office immediately at frontofficefirstlove@gmail.com.",
    },
    {
      question: "What should we do if there is damage or an issue during meeting?",
      answer:
        "Report immediately via email. Failure to report may result in liability.",
    },
    {
      question: "What happens if we exceed our booked time?",
      answer:
        "Notify Front Office immediately for extension. If space is unavailable, vacate at original end time. Unauthorized extension is not permitted.",
    },
    {
      question: "What are Front Office working hours?",
      answer:
        "Weekdays 5:00 PM to 11:00 PM, Saturdays 8:00 AM to 5:00 PM, Sundays 8:00 AM to 11:00 PM.",
    },
    {
      question: "Do you accept same-day bookings?",
      answer:
        "No. All bookings must be made in advance within weekly booking window.",
    },
    {
      question: "What if I have enquiries not covered on the platform?",
      answer:
        "Send enquiries (including naming ceremonies and other special events) to frontofficefirstlove@gmail.com.",
    },
  ],
  itemTermsTitle: "Special Item Use - Terms and Conditions",
  itemTermsIntro:
    "By booking and using the Fender (speaker), you agree to comply with the following terms and conditions.",
  itemTerms: [
    "The Fender may be collected no earlier than five (5) minutes before the commencement of the approved booking time. Where the Fender is intended to be used outside the church premises, the Front Office must be notified immediately after completing the booking via email.",
    "The Fender must be handled with utmost care at all times and returned in the same condition in which it was received.",
    "The group or individual making the booking shall be fully responsible for the Fender throughout the duration of the booking period. Any loss, damage, or misuse during this time shall be the responsibility of the user.",
    "At the end of the booking period, the Fender must be returned immediately to the Front Office for inspection. Upon successful inspection, the Fender must then be returned to its designated storage location, the Creative Storeroom.",
  ],
};
