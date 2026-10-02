import Link from 'next/link';
import { ThemeLogo } from '@/components/theme-logo';

/** Shared wordmark used across the auth screens. */
export function AuthBrand() {
  return (
    <div className="mb-8 flex justify-center">
      <Link href="/" aria-label="NoviMP home" className="flex items-center gap-3">
        <ThemeLogo width={40} height={40} className="rounded-xl" />
        <span className="text-2xl font-bold tracking-tight">NoviMP</span>
      </Link>
    </div>
  );
}
