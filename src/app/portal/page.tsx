import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function PortalPage() {
  // Redirect to portal login by default
  redirect('/portal/login')
}
