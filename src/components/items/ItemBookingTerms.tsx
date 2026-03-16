type ItemBookingTermsProps = {
  title?: string;
};

export default function ItemBookingTerms({
  title = "Special Item Use - Terms and Conditions",
}: ItemBookingTermsProps) {
  return (
    <details className="card p-4" open={false}>
      <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[var(--navy)]">{title}</span>
        <span className="text-xs text-[var(--muted)]">Click to expand</span>
      </summary>

      <div className="mt-4 space-y-3 text-sm text-[var(--slate)] leading-relaxed">
        <p>
          By booking and using the Fender (speaker), you agree to comply with the following terms and conditions.
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            The Fender may be collected no earlier than five (5) minutes before the commencement of the approved booking time.
            Where the Fender is intended to be used outside the church premises, the Front Office must be notified immediately after completing the booking via email.
          </li>
          <li>
            The Fender must be handled with utmost care at all times and returned in the same condition in which it was received.
          </li>
          <li>
            The group or individual making the booking shall be fully responsible for the Fender throughout the duration of the booking period.
            Any loss, damage, or misuse during this time shall be the responsibility of the user.
          </li>
          <li>
            At the end of the booking period, the Fender must be returned immediately to the Front Office for inspection.
            Upon successful inspection, the Fender must then be returned to its designated storage location, the Creative Storeroom.
          </li>
        </ol>
      </div>
    </details>
  );
}
