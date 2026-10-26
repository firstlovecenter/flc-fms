import BodyScope from "@/components/layout/BodyScope";

/** Sign-in, registration and password pages share the console theme. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface-cool min-h-dvh bg-background">
      <BodyScope className="surface-cool" />
      {children}
    </div>
  );
}
