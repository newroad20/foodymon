import React, { useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

/** TextInput whose example text disappears as soon as the field is tapped. */
export function HintInput({ placeholder, onFocus, onBlur, ...props }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...props}
      placeholder={focused ? '' : placeholder}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
    />
  );
}
