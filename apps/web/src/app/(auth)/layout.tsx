import { AuthSidebar } from '@/components/auth/auth-sidebar';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-bg flex min-h-screen">
      {/* Left pane: Image sidebar (hidden on mobile, takes 50% width on lg screens) */}
      <div className="hidden lg:block lg:w-1/2">
        <AuthSidebar />
      </div>

      {/* Right pane: Auth forms */}
      <div className="flex w-full items-center justify-center bg-background lg:w-1/2">
        <div className="w-full max-w-md px-4 py-10 sm:px-8">
          <div className="rounded-2xl border border-border bg-card px-6 py-8 shadow-xl sm:px-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
