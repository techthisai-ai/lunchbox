import React from 'react';
import OriginalText from '@lunchflow/original-text';
import { applyRobotoFontStyle } from './applyRobotoFont';

type TextProps = Record<string, unknown> & {
  style?: unknown;
};

/**
 * Drop-in Text that forces bundled Poppins on every device.
 * Playfair Display / Tahu are left intact when set as fontFamily.
 */
const PatchedText = React.forwardRef<unknown, TextProps>(function PatchedText(props, ref) {
  const { style, ...rest } = props;
  return <OriginalText {...rest} ref={ref} style={applyRobotoFontStyle(style as never)} />;
});

PatchedText.displayName = 'Text';

export default PatchedText;
