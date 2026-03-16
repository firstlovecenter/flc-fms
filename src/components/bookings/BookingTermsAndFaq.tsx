type BookingTermsAndFaqProps = {
  title?: string;
};

export default function BookingTermsAndFaq({
  title = "Booking Terms and Conditions",
}: BookingTermsAndFaqProps) {
  return (
    <details className="card p-4" open={false}>
      <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[var(--navy)]">{title}</span>
        <span className="text-xs text-[var(--muted)]">Click to expand</span>
      </summary>

      <div className="mt-4 space-y-4 text-sm text-[var(--slate)] leading-relaxed">
        <section className="space-y-2">
          <h3 className="font-semibold text-[var(--navy)]">Terms and Conditions</h3>
          <p>
            By proceeding with a booking on this platform, you acknowledge that you have read,
            understood, and agreed to the following Terms and Conditions governing the use of
            the spaces and equipment.
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <strong>Acceptance of Terms:</strong> All bookings are subject to these Terms and
              Conditions. Booking confirmation is conditional upon your agreement to comply fully
              with all guidelines stated herein.
            </li>
            <li>
              <strong>Mandatory Sign-In:</strong> Users must sign in before accessing or using
              the space through the official sign-in link provided. Failure to sign in will be
              treated as unauthorized use.
            </li>
            <li>
              <strong>Cleaning Obligations (Mandatory After Every Meeting):</strong> The booking
              group bears full responsibility for ensuring the space is thoroughly cleaned after
              use.
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>All chairs must be neatly rearranged in their original order and position.</li>
                <li>All tables must be wiped clean.</li>
                <li>Floors must be swept and mopped.</li>
                <li>All visible dirt, crumbs, and debris must be removed.</li>
                <li>Any spills must be cleaned immediately.</li>
                <li>No water, drinks, food, or liquids should be left on the floor, chairs, or tables.</li>
                <li>Chairs must be free of stains or spills.</li>
                <li>No bottles, cans, food wrappers, tissues, rubbers, or personal items should be left behind.</li>
                <li>All waste must be disposed of in designated bins.</li>
                <li>Cleaning tools must be returned to their designated location behind Benson Idahosa Chapel after use.</li>
              </ul>
              <p className="mt-2">Failure to meet these standards will attract a fine.</p>
            </li>
            <li>
              <strong>Shared or Private Use (Second Floor / Auditorium):</strong> Booking groups
              may choose to share the space with another group or keep it private. Where the space
              is shared, all groups must mutually agree on cleaning arrangements that comply with
              the stated cleaning standards. The group that completes the booking on this platform
              remains the officially responsible party. Any complaints, damage, or breaches will be
              addressed to the booking group. If the space is left unclean after use, the booking
              group will be fined, regardless of whether the space was shared.
            </li>
            <li>
              <strong>Non-Transferability of Bookings:</strong> Bookings may not be transferred to
              another group without prior notification and approval from the Front Office.
            </li>
            <li>
              <strong>Mandatory Sign-Out:</strong> Users must sign out after their meeting using
              the official sign-out link provided.
            </li>
            <li>
              <strong>Air Conditioner Usage (Optional):</strong> AC usage attracts additional fees:
              Chapels GHS 100 per hour, Glass Offices GHS 50 per hour. Payment must be made in
              physical cash to the Front Office before the meeting begins. Unauthorized use of AC
              units is prohibited.
            </li>
            <li>
              <strong>Locking, Inspection, and Evidence of Cleaning:</strong> At the end of the
              meeting, the space must be properly locked. Where physical inspection is possible, the
              Front Office must be notified before key return. Where immediate inspection is not
              possible, clear photographic evidence of the cleaned space is required, showing chairs
              arranged, floors swept and mopped, tables clean, and satisfactory condition. Evidence
              must be submitted through +233 53 845 1046 or presented upon request.
            </li>
            <li>
              <strong>Key Return and Conditional Approval:</strong> Keys should be returned after
              submission of photographic evidence or physical inspection by the Front Office.
              Submission of photographs does not waive the Front Office right to inspect later. If
              subsequent inspection or review shows inadequate or misrepresented cleaning, the booking
              group remains liable and subject to fines.
            </li>
            <li>
              <strong>Equipment Issued by the Front Office:</strong> Any issued equipment (including
              microphones, fenders, or other items) must be returned in good condition and must never
              be left unattended at the Front Office door, including when closed. Return strictly by
              Front Office instructions.
            </li>
            <li>
              <strong>Liability for Loss or Damage:</strong> The booking group is responsible for the
              cost of lost, damaged, or mishandled keys, equipment, or property.
            </li>
            <li>
              <strong>General Conduct:</strong> All users are expected to act responsibly and preserve
              cleanliness, safety, order, and sanctity of the space at all times.
            </li>
            <li>
              <strong>Fines and Enforcement:</strong> Failure to comply with these terms attracts a
              fine of GHS 500 or higher, depending on the space and severity of breach.
            </li>
            <li>
              <strong>Right to Refuse Booking:</strong> If you are unable or unwilling to comply with
              these terms, do not proceed with the booking.
            </li>
          </ol>
        </section>

      </div>
    </details>
  );
}
