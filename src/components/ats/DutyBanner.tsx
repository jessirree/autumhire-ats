import { Info } from 'lucide-react';

/** Short reminder of what the hiring manager is expected to do on this page. */
export function DutyBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 text-blue-800 rounded-lg px-4 py-3 text-sm mb-6">
      <Info className="size-4 shrink-0 mt-0.5" />
      <p>{children}</p>
    </div>
  );
}
