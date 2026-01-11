import { NextRequest, NextResponse } from 'next/server'
import { validateResetToken } from '@/lib/password-reset'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'No token provided' },
        { status: 400 }
      )
    }

    const result = await validateResetToken(token)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Validate reset token error:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate token' },
      { status: 500 }
    )
  }
}
