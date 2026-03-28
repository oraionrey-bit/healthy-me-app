export const launchImageLibraryAsync = jest.fn(() => Promise.resolve({ canceled: true, assets: [] }));
export const launchCameraAsync = jest.fn(() => Promise.resolve({ canceled: true, assets: [] }));
export const requestMediaLibraryPermissionsAsync = jest.fn(() => Promise.resolve({ granted: true }));
export const MediaTypeOptions = { Images: 'Images', Videos: 'Videos', All: 'All' };
