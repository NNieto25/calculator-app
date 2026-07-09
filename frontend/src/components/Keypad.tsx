import type { CSSProperties, ReactNode } from "react";

import type { InputAction } from "../hooks/useCalculator";
import { KeyButton, type KeyVariant } from "./KeyButton";

interface KeyConfig {
  id: string;
  label: ReactNode;
  ariaLabel: string;
  variant: KeyVariant;
  action: InputAction;
  style?: CSSProperties;
}

// The layout follows a conventional 4-column calculator: functions on top,
// operators down the right edge, a wide zero and a double-height equals.
const KEYS: KeyConfig[] = [
  { id: "clear", label: "AC", ariaLabel: "Clear", variant: "clear", action: { type: "clear" } },
  { id: "backspace", label: "⌫", ariaLabel: "Delete", variant: "function", action: { type: "backspace" } },
  { id: "percentage", label: "%", ariaLabel: "Percentage", variant: "function", action: { type: "unary", operator: "percentage" } },
  { id: "divide", label: "÷", ariaLabel: "Divide", variant: "operator", action: { type: "operator", operator: "divide" } },

  { id: "sqrt", label: "√", ariaLabel: "Square root", variant: "function", action: { type: "unary", operator: "sqrt" } },
  { id: "power", label: (<span>x<sup>y</sup></span>), ariaLabel: "Exponent", variant: "function", action: { type: "operator", operator: "power" } },
  { id: "negate", label: "±", ariaLabel: "Toggle sign", variant: "function", action: { type: "negate" } },
  { id: "multiply", label: "×", ariaLabel: "Multiply", variant: "operator", action: { type: "operator", operator: "multiply" } },

  { id: "7", label: "7", ariaLabel: "7", variant: "digit", action: { type: "digit", value: "7" } },
  { id: "8", label: "8", ariaLabel: "8", variant: "digit", action: { type: "digit", value: "8" } },
  { id: "9", label: "9", ariaLabel: "9", variant: "digit", action: { type: "digit", value: "9" } },
  { id: "subtract", label: "−", ariaLabel: "Subtract", variant: "operator", action: { type: "operator", operator: "subtract" } },

  { id: "4", label: "4", ariaLabel: "4", variant: "digit", action: { type: "digit", value: "4" } },
  { id: "5", label: "5", ariaLabel: "5", variant: "digit", action: { type: "digit", value: "5" } },
  { id: "6", label: "6", ariaLabel: "6", variant: "digit", action: { type: "digit", value: "6" } },
  { id: "add", label: "+", ariaLabel: "Add", variant: "operator", action: { type: "operator", operator: "add" } },

  { id: "1", label: "1", ariaLabel: "1", variant: "digit", action: { type: "digit", value: "1" } },
  { id: "2", label: "2", ariaLabel: "2", variant: "digit", action: { type: "digit", value: "2" } },
  { id: "3", label: "3", ariaLabel: "3", variant: "digit", action: { type: "digit", value: "3" } },
  { id: "equals", label: "=", ariaLabel: "Equals", variant: "equals", action: { type: "equals" }, style: { gridRow: "span 2" } },

  { id: "0", label: "0", ariaLabel: "0", variant: "digit", action: { type: "digit", value: "0" }, style: { gridColumn: "span 2" } },
  { id: "decimal", label: ".", ariaLabel: "Decimal point", variant: "digit", action: { type: "decimal" } },
];

interface KeypadProps {
  onPress: (action: InputAction) => void;
  disabled: boolean;
}

export function Keypad({ onPress, disabled }: KeypadProps) {
  return (
    <div className="keypad">
      {KEYS.map((key) => (
        <KeyButton
          key={key.id}
          label={key.label}
          ariaLabel={key.ariaLabel}
          variant={key.variant}
          disabled={disabled}
          style={key.style}
          onPress={() => onPress(key.action)}
        />
      ))}
    </div>
  );
}
