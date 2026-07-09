/** tel:/mailto: CTA used wherever ceremony code instructions used to link to a request page. */
export default function ContactOfficeLink({
  officePhone,
  officeEmail,
  label,
  className,
}: {
  officePhone?: string;
  officeEmail?: string;
  /** e.g. "Call our office for a code" or "Don't have a code? Call our office". */
  label: string;
  className?: string;
}) {
  if (officePhone) {
    return (
      <a href={`tel:${officePhone}`} className={className}>
        {label} ({officePhone}) →
      </a>
    );
  }
  if (officeEmail) {
    return (
      <a href={`mailto:${officeEmail}`} className={className}>
        {label} ({officeEmail}) →
      </a>
    );
  }
  return null;
}
