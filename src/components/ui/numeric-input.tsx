import * as React from "react"
import { Input } from "./input"
import { cn } from "../../lib/utils"

export interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  prefix?: string;
  decimals?: number;
}

export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ className, value, onChange, min, max, prefix, decimals = 2, onBlur, onFocus, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [localValue, setLocalValue] = React.useState('');

    // Parse value to standard float
    const getNumericValue = (val: any): number => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const clean = String(val).replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? 0 : parsed;
    };

    const currentNum = getNumericValue(value);

    // Format utility for standard Brazilian/decimal format on blur
    const formatValue = (num: number) => {
      return num.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    };

    // Sync with external state
    React.useEffect(() => {
      if (!isFocused) {
        setLocalValue(formatValue(currentNum));
      }
    }, [value, isFocused, decimals]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // On focus, show the clean raw number with comma for standard input editing in PT-BR, 
      // or simple number string if 0, show empty for clean typing experience.
      const rawString = currentNum === 0 ? '' : currentNum.toString().replace('.', ',');
      setLocalValue(rawString);
      if (onFocus) onFocus(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let valStr = e.target.value;
      
      // Allow only numbers, one dot or comma, and optional negative sign at start
      // Replace duplicate separators to prevent invalid parsing
      valStr = valStr.replace(/[^0-9.,-]/g, '');
      
      setLocalValue(valStr);

      // Parse the number for state update (normalize comma to dot first)
      const parseStr = valStr.replace(',', '.');
      const parsed = parseFloat(parseStr);
      if (!isNaN(parsed)) {
        onChange(parsed);
      } else {
        onChange(0);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      let validated = currentNum;
      
      if (min !== undefined && validated < min) validated = min;
      if (max !== undefined && validated > max) validated = max;

      onChange(validated);
      setLocalValue(formatValue(validated));
      if (onBlur) onBlur(e);
    };

    return (
      <div className="relative flex items-center w-full">
        {prefix && (
          <span className="absolute left-3 text-slate-400 text-xs font-bold pointer-events-none z-10 select-none">
            {prefix}
          </span>
        )}
        <Input
          type="text"
          className={cn(
            prefix ? "pl-9" : "",
            className
          )}
          ref={ref}
          value={localValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
      </div>
    )
  }
)
NumericInput.displayName = "NumericInput"

