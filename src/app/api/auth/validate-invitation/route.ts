import { NextRequest, NextResponse } from 'next/server'
import { validateInvitation } from '@/lib/invitations'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'No token provided' },
        { status: 400 }
      )
    }

    const result = await validateInvitation(token)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Validate invitation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate invitation' },
      { status: 500 }
    )
  }
}
