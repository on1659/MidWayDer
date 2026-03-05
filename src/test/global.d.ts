import 'vitest';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<T> {
    toBeInTheDocument(): void;
    toBeDisabled(): void;
    toBeEnabled(): void;
    toBeEmpty(): void;
    toBeEmptyDOMElement(): void;
    toBeInvalid(): void;
    toBeRequired(): void;
    toBeValid(): void;
    toBeVisible(): void;
    toContainElement(element: Element | null): void;
    toContainHTML(html: string): void;
    toHaveAccessibleDescription(description?: string | RegExp): void;
    toHaveAccessibleName(name?: string | RegExp): void;
    toHaveAttribute(attr: string, value?: string | RegExp): void;
    toHaveClass(...classNames: string[]): void;
    toHaveFocus(): void;
    toHaveFormValues(values: Record<string, unknown>): void;
    toHaveStyle(css: Record<string, unknown>): void;
    toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace: boolean }): void;
    toHaveValue(value?: string | string[] | number): void;
    toHaveDisplayValue(value?: string | string[] | RegExp): void;
    toBeChecked(): void;
    toBePartiallyChecked(): void;
    toHaveErrorMessage(message?: string | RegExp): void;
  }
}
