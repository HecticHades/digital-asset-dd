import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createPasswordResetToken } from '@/lib/password-reset'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    const result = await createPasswordResetToken(email)

    // In development, you might want to log the token
    if (process.env.NODE_ENV === 'development' && result.token) {
      console.log(`Password reset token for ${email}: ${result.token}`)
      console.log(`Reset URL: ${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${result.token}`)
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
