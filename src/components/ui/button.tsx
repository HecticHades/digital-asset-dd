import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-600':
              variant === 'primary',
            'bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-500':
              variant === 'secondary',
            'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600':
              variant === 'destructive',
            'border border-slate-300 bg-transparent hover:bg-slate-100 focus-visible:ring-slate-500':
              variant === 'outline',
            'bg-transparent hover:bg-slate-100 focus-visible:ring-slate-500':
              variant === 'ghost',
          },
          {
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 text-sm': size === 'md',
            'h-12 px-6 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button }
