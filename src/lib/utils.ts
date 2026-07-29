import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value || 0);
}

export function applyPhoneMask(value: string): string {
  return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4,5})(\d)/, '$1-$2').slice(0, 15);
}

export function applyCEPMask(value: string): string {
  return value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);
}

export function applyCPFMask(value: string): string {
  return applyCpfCnpjMask(value);
}

export function applyCpfCnpjMask(value: string): string {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
}

export function validateCPF(cpf: string): boolean {
  const clean = (cpf || '').replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1+$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = (sum * 10) % 11;
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = (sum * 10) % 11;
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

export function validateCNPJ(cnpj: string): boolean {
  const clean = (cnpj || '').replace(/\D/g, '');
  if (clean.length !== 14) return false;
  if (/^(\d)\1+$/.test(clean)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean.charAt(i), 10) * weights1[i];
  }
  let rev = sum % 11;
  const d1 = rev < 2 ? 0 : 11 - rev;
  if (d1 !== parseInt(clean.charAt(12), 10)) return false;

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(clean.charAt(i), 10) * weights2[i];
  }
  rev = sum % 11;
  const d2 = rev < 2 ? 0 : 11 - rev;
  if (d2 !== parseInt(clean.charAt(13), 10)) return false;

  return true;
}

export function validateCpfOrCnpj(doc: string): { isValid: boolean; type: 'cpf' | 'cnpj' | 'unknown'; message?: string } {
  const clean = (doc || '').replace(/\D/g, '');
  if (clean.length === 11) {
    const isValid = validateCPF(clean);
    return {
      isValid,
      type: 'cpf',
      message: isValid ? 'CPF Válido' : 'CPF Inválido (verifique os dígitos)'
    };
  }
  if (clean.length === 14) {
    const isValid = validateCNPJ(clean);
    return {
      isValid,
      type: 'cnpj',
      message: isValid ? 'CNPJ Válido (Pessoa Jurídica)' : 'CNPJ Inválido (verifique os dígitos)'
    };
  }
  return {
    isValid: false,
    type: 'unknown',
    message: clean.length === 0 ? 'Documento pendente' : `Incompleto (${clean.length} dígitos)`
  };
}

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(password));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
