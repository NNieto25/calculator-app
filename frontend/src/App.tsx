import { Display } from "./components/Display";
import { Keypad } from "./components/Keypad";
import { useCalculator } from "./hooks/useCalculator";

export default function App() {
  const { display, expression, busy, press } = useCalculator();

  return (
    <main className="app">
      <section className="calculator" aria-label="Calculator">
        <header className="calculator__brand">
          <span className="calculator__mark" aria-hidden="true">
            ⌾
          </span>
          <span className="tooltip">
            <h1 className="calculator__title" tabIndex={0} aria-describedby="keyboard-hint">
              Calculator App
            </h1>
            <span className="tooltip__content" role="tooltip" id="keyboard-hint">
              Works with your keyboard too — digits, <kbd>+</kbd> <kbd>−</kbd> <kbd>×</kbd>{" "}
              <kbd>÷</kbd>, <kbd>^</kbd> for power, <kbd>%</kbd>, <kbd>R</kbd> for √, <kbd>Enter</kbd>{" "}
              to equal.
            </span>
          </span>
        </header>

        <Display value={display} expression={expression} busy={busy} />
        <Keypad onPress={press} disabled={busy} />
      </section>
    </main>
  );
}
