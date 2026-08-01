import React from 'react';
import OriginalTextInput from '@lunchflow/original-text-input';
import { applyRobotoFontStyle } from './applyRobotoFont';

type TextInputProps = Record<string, unknown> & {
  style?: unknown;
};

/**
 * Drop-in TextInput that forces bundled Roboto on every device.
 */
const PatchedTextInput = React.forwardRef<unknown, TextInputProps>(function PatchedTextInput(
  props,
  ref,
) {
  const { style, ...rest } = props;
  return <OriginalTextInput {...rest} ref={ref} style={applyRobotoFontStyle(style as never)} />;
});

PatchedTextInput.displayName = 'TextInput';

// Preserve RN statics (e.g. TextInput.State.blurTextInput).
const PatchedWithStatics = PatchedTextInput as typeof PatchedTextInput & {
  State?: (typeof OriginalTextInput)['State'];
};
if (OriginalTextInput.State) {
  PatchedWithStatics.State = OriginalTextInput.State;
}

export default PatchedWithStatics;
