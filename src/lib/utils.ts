import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatNumber(value: number, decimals: number = 3): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function parsePTBRFloat(value: string): number {
  if (!value) return 0;
  // Remove dots (thousands) and replace comma with dot (decimal)
  const cleanValue = value.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

export async function hashPassword(password: string): Promise<string> {
  if (!password) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function applyCPFMask(v: string): string {
  let value = v.replace(/\D/g, "");
  if (value.length > 11) value = value.substring(0, 11);
  if (value.length <= 3) return value;
  if (value.length <= 6) return value.replace(/(\d{3})(\d{1,3})/, "$1.$2");
  if (value.length <= 9) return value.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
  return value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
}

export function applyCNPJMask(v: string): string {
  let value = v.replace(/\D/g, "");
  if (value.length > 14) value = value.substring(0, 14);
  if (value.length <= 2) return value;
  if (value.length <= 5) return value.replace(/(\d{2})(\d{1,3})/, "$1.$2");
  if (value.length <= 8) return value.replace(/(\d{2})(\d{3})(\d{1,3})/, "$1.$2.$3");
  if (value.length <= 12) return value.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, "$1.$2.$3/$4");
  return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, "$1.$2.$3/$4-$5");
}

export function applyPhoneMask(v: string): string {
  let value = v.replace(/\D/g, "");
  if (value.length > 11) value = value.substring(0, 11);
  
  if (value.length <= 2) return value.length > 0 ? `(${value}` : value;
  if (value.length <= 6) return value.replace(/(\d{2})(\d{1,4})/, "($1)$2");
  if (value.length <= 10) return value.replace(/(\d{2})(\d{4})(\d{1,4})/, "($1)$2-$3");
  return value.replace(/(\d{2})(\d{5})(\d{1,4})/, "($1)$2-$3");
}

export function applyCEPMask(v: string): string {
  let value = v.replace(/\D/g, "");
  if (value.length > 8) value = value.substring(0, 8);
  if (value.length <= 5) return value;
  return value.replace(/(\d{5})(\d{1,3})/, "$1-$2");
}
