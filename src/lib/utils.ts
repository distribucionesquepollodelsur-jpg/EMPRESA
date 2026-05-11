import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string | number, includeTime = true): string {
  if (!date) return '-';
  
  let finalDate: Date;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // For YYYY-MM-DD, create date at noon to avoid timezone shift to previous day
    finalDate = new Date(`${date}T12:00:00`);
  } else {
    finalDate = new Date(date);
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  const isDateOnly = (typeof date === 'string' && date.length <= 10) || !includeTime;

  if (!isDateOnly) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return new Intl.DateTimeFormat('es-CO', options).format(finalDate);
}
