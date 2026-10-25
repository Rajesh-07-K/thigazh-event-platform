import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amountInPaise: number, currency: string = "INR"): string {
  const rupees = amountInPaise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function formatDate(dateInput: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  };
  return new Intl.DateTimeFormat("en-IN", defaultOptions).format(date);
}

export function formatShortDate(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatTime(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
