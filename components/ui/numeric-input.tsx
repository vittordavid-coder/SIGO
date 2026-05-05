import React, { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { formatNumber, parsePTBRFloat, cn } from '../../lib/utils';

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  decimals?: number;
  prefix?: string;
}

export function NumericInput({ 
  value, 
  onChange, 
  decimals = 2, 
  prefix,
  className,
  ...props 
}: NumericInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatNumber(value, decimals));
    }
  }, [value, decimals, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Allow typing numbers, commas, dots and a leading minus
    const sanitized = rawValue.replace(/[^0-9,.-]/g, '');
    setDisplayValue(sanitized);
    
    // Attempt to parse
    const parsed = parsePTBRFloat(sanitized);
    
    // Debounce the parent update to keep typing smooth
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (parsed !== value) {
        onChange(parsed);
      }
    }, 300); // 300ms debounce
  };

  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      const parsed = parsePTBRFloat(displayValue);
      if (parsed !== value) onChange(parsed);
    }
    setIsFocused(false);
    setDisplayValue(formatNumber(value, decimals));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Show raw numbers for easier editing, keep the comma
    setDisplayValue(value.toString().replace('.', ','));
    // Optional: select text on focus
    e.target.select();
  };

  return (
    <div className="relative w-full">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold uppercase pointer-events-none">
          {prefix}
        </span>
      )}
      <Input
        {...props}
        className={cn(className, prefix && "pl-8")}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </div>
  );
}
