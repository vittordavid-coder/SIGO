import * as React from "react"
import { Input } from "./input"

export interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: number | string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  decimals?: number;
}

export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ className, value, onChange, min, max, step = 1, prefix, decimals, ...props }, ref) => {
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange(val);
      } else if (e.target.value === '' || e.target.value === '-') {
        // We'd need to handle empty states if the parent supports it, 
        // but for now we won't propagate empty properly if restricted to number.
        // If it's empty, we might pass 0 or NaN depending on behavior wanted.
        onChange(0);
      }
    };

    return (
      <Input
        type="number"
        className={className}
        ref={ref}
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        {...props}
      />
    )
  }
)
NumericInput.displayName = "NumericInput"
