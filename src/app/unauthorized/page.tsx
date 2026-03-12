import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-6">
          You don&apos;t have permission to view this page. Contact your Facility Manager if you need access.
        </p>
        <Link href="/dashboard" className="btn-primary">Go to Dashboard</Link>
      </div>
    </div>
  );
}
