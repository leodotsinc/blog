import Link from 'next/link'
import SiteShell from '@/components/SiteShell'

export default function NotFound() {
  return (
    <SiteShell>
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
      <h1 className="text-6xl font-bold">404</h1>
      <h2 className="text-2xl font-semibold">Page Not Found</h2>
      <p className="text-muted-foreground">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-4 rounded-lg bg-primary px-6 py-3 text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Go back home
      </Link>
    </div>
    </SiteShell>
  )
}
