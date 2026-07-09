import type { CSSProperties, ReactNode } from "react";

export type KeyVariant = "digit" | "function" | "operator" | "equals" | "clear";

interface KeyButtonProps {
  label: ReactNode;
  ariaLabel: string;
  variant: KeyVariant;
  onPress: () => void;
  disabled?: boolean;
  style?: CSSProperties;
}

export function KeyButton({ label, ariaLabel, variant, onPress, disabled, style }: KeyButtonProps) {
  return (
    <button
      type="button"
      className={`key key--${variant}`}
      aria-label={ariaLabel}
      onClick={onPress}
      disabled={disabled}
      style={style}
    >
      {label}
    </button>
  );
}
