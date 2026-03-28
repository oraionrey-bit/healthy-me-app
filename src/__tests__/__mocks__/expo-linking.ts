export const createURL = jest.fn((path: string) => `healthyme://${path}`);
export const openURL = jest.fn();
export const canOpenURL = jest.fn(() => Promise.resolve(true));
