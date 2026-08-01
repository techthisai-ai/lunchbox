declare module '@lunchflow/original-text' {
  import type { ComponentType, Ref } from 'react';
  const Text: ComponentType<Record<string, unknown> & { ref?: Ref<unknown>; style?: unknown }>;
  export default Text;
}

declare module '@lunchflow/original-text-input' {
  import type { ComponentType, Ref } from 'react';
  const TextInput: ComponentType<Record<string, unknown> & { ref?: Ref<unknown>; style?: unknown }> & {
    State?: {
      blurTextInput: (input: unknown) => void;
      currentlyFocusedField: () => unknown;
      currentlyFocusedInput: () => unknown;
      focusTextInput: (input: unknown) => void;
    };
    displayName?: string;
  };
  export default TextInput;
}
