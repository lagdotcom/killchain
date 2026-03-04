export const enumerate = (n: number) => Array.from({ length: n }, (_, i) => i);

type ClassNameValue = string | Record<string, boolean> | undefined | null;

export function classnames(...args: ClassNameValue[]) {
  return args
    .map((cn) => {
      if (typeof cn === "string") return cn;
      if (typeof cn === "object" && cn !== null) {
        return Object.entries(cn)
          .filter(([, value]) => value)
          .map(([key]) => key)
          .join(" ");
      }
      return "";
    })
    .join(" ");
}
