import { redirect } from 'next/navigation'

export default function PortalPage() {
  // Redirect to portal login by default
  redirect('/portal/login')
}
