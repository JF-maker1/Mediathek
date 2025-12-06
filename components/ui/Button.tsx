import React from 'react';
import Link from 'next/link';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper pro spojování tříd
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'brand' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  href?: string; // Pokud je zadáno href, renderuje se jako Link
  target?: string;
}

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  href, 
  children, 
  ...props 
}: ButtonProps) {
  
  // Základní styly
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer";
  
  // Varianty (60-30-10 pravidlo)
  const variants = {
    primary: "bg-[rgb(var(--accent))] hover:bg-[rgb(var(--accent-hover))] text-[rgb(var(--accent-foreground))] shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 border border-transparent", // 10% Akcent (CTA)
    brand: "bg-[rgb(var(--brand))] hover:brightness-110 text-[rgb(var(--brand-foreground))] shadow-md shadow-indigo-500/20", // 30% Brand
    outline: "border-2 border-gray-200 dark:border-gray-700 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-[rgb(var(--text-primary))]", // Sekundární
    ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]"
  };

  // Velikosti
  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-6 text-base",
    lg: "h-14 px-8 text-lg",
    xl: "h-16 px-10 text-xl"
  };

  const combinedClassName = cn(
    baseStyles,
    variants[variant],
    sizes[size],
    className
  );

  // Render jako Link
  if (href) {
    return (
      <Link href={href} className={combinedClassName} target={props.target}>
        {children}
      </Link>
    );
  }

  // Render jako Button
  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
}