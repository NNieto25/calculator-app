import { cx } from "../lib/classNames";

interface DisplayProps {
  value: string;
  expression: string;
  busy: boolean;
}

// The readout shrinks as the value grows so long results stay legible, the way
// a physical calculator does. Steps are ordered from largest to smallest and
// matched by the first one that fits.
const FONT_SIZE_STEPS = [
  { maxLength: 8, fontSize: "clamp(2.6rem, 12vw, 3.4rem)" },
  { maxLength: 11, fontSize: "clamp(2rem, 9vw, 2.6rem)" },
];
const SMALLEST_FONT_SIZE = "clamp(1.4rem, 6.5vw, 1.9rem)";

function fontSizeForLength(length: number): string {
  const step = FONT_SIZE_STEPS.find((candidate) => length <= candidate.maxLength);
  return step?.fontSize ?? SMALLEST_FONT_SIZE;
}

export function Display({ value, expression, busy }: DisplayProps) {
  return (
    <div className="display">
      <div className="display__expression" data-testid="display-expression">
        {expression || " "}
      </div>
      <div
        className={cx("display__value", busy && "display__value--busy")}
        data-testid="display-value"
        aria-live="polite"
        style={{ fontSize: fontSizeForLength(value.length) }}
      >
        {value}
      </div>
      <div className={cx("display__status", busy && "display__status--on")} aria-hidden="true">
        <span className="display__dot" />
        <span className="display__dot" />
        <span className="display__dot" />
      </div>
    </div>
  );
}
