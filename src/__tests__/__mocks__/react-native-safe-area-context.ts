import React from 'react';

const insets = { top: 47, left: 0, right: 0, bottom: 34 };

export const SafeAreaProvider = ({ children }: any) => children;
export const SafeAreaView = ({ children, ...props }: any) =>
  React.createElement('div', props, children);
export const useSafeAreaInsets = () => insets;
export const useSafeAreaFrame = () => ({ x: 0, y: 0, width: 375, height: 812 });
export const SafeAreaInsetsContext = React.createContext(insets);
export const initialWindowMetrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets,
};
