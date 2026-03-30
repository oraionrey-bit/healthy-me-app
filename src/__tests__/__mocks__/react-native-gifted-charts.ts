import React from 'react';

const MockChart = (props: Record<string, unknown>) =>
  React.createElement('View', { testID: 'mock-chart', ...props });

export const LineChart = MockChart;
export const BarChart = MockChart;
export const PieChart = MockChart;
