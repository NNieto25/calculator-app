// cx joins class names, dropping any that are falsy. It keeps conditional
// classes declarative: cx("box", active && "box--active").
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
