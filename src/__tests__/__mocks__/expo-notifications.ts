export const getExpoPushTokenAsync = jest.fn(() => Promise.resolve({ data: 'test-token' }));
export const setNotificationHandler = jest.fn();
export const scheduleNotificationAsync = jest.fn(() => Promise.resolve('notification-id'));
export const cancelScheduledNotificationAsync = jest.fn();
export const requestPermissionsAsync = jest.fn(() => Promise.resolve({ granted: true }));
