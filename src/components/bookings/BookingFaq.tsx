type BookingFaqProps = {
  title?: string;
};

export default function BookingFaq({
  title = "Booking FAQs",
}: BookingFaqProps) {
  return (
    <section className="card p-5 space-y-4">
      <h2 className="text-lg font-semibold text-[var(--navy)]">{title}</h2>

      <ol className="list-decimal pl-5 space-y-2 text-sm text-[var(--slate)] leading-relaxed">
        <li>
          <strong>How do I receive access to the space I booked?</strong> For Glass Offices or
          Second Floor bookings, an access code is sent one hour before booking via provided
          contact details.
        </li>
        <li>
          <strong>How can I communicate with the Front Office?</strong> Strictly via email:
          frontofficefirstlove@gmail.com. Walk-ins, calls, or messages on other platforms are
          not attended to.
        </li>
        <li>
          <strong>What do the weekday time slots mean?</strong> On weekdays: 6:00 PM booking
          means 6:00 PM to 10:00 PM (fellowship meetings), and 10:00 PM booking means 10:00 PM
          to 4:00 AM (all-night services).
        </li>
        <li>
          <strong>Can I book for multiple weeks or a future date?</strong> No. Bookings are taken
          weekly for the current available week only.
        </li>
        <li>
          <strong>Can I change or transfer my booking to another group?</strong> No, not without
          prior Front Office approval.
        </li>
        <li>
          <strong>What happens if the space is not cleaned properly after use?</strong> The
          booking group remains responsible and may receive a fine of GHS 500 or more.
        </li>
        <li>
          <strong>What if Front Office is not available to inspect after meeting?</strong> Take
          clear photos showing proper cleaning and restoration; keep for Front Office request.
        </li>
        <li>
          <strong>Is there a cost for using chapels, glass offices, second floor, or Engedi?</strong>
          Spaces are free for meetings and fellowships. AC usage is paid in cash before meeting:
          Chapels GHS 100/hour, Glass Offices GHS 50/hour.
        </li>
        <li>
          <strong>When should I expect booking confirmation?</strong> After completing booking and
          agreeing to these terms.
        </li>
        <li>
          <strong>What if I made a wrong booking or need to cancel?</strong> Email the Front Office
          immediately at frontofficefirstlove@gmail.com.
        </li>
        <li>
          <strong>What should we do if there is damage or an issue during meeting?</strong>
          Report immediately via email. Failure to report may result in liability.
        </li>
        <li>
          <strong>What happens if we exceed our booked time?</strong> Notify Front Office
          immediately for extension. If space is unavailable, vacate at original end time.
          Unauthorized extension is not permitted.
        </li>
        <li>
          <strong>What are Front Office working hours?</strong> Weekdays 5:00 PM to 11:00 PM,
          Saturdays 8:00 AM to 5:00 PM, Sundays 8:00 AM to 11:00 PM.
        </li>
        <li>
          <strong>Do you accept same-day bookings?</strong> No. All bookings must be made in
          advance within weekly booking window.
        </li>
        <li>
          <strong>What if I have enquiries not covered on the platform?</strong> Send enquiries
          (including naming ceremonies and other special events) to frontofficefirstlove@gmail.com.
        </li>
      </ol>
    </section>
  );
}
