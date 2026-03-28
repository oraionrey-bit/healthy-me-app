import React from 'react';
import { View } from 'react-native';

export const LinearGradient = ({ children, ...props }: any) =>
  React.createElement(View, props, children);
