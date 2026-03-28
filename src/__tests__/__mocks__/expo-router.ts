// Mock expo-router for tests
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn(),
};

export const router = mockRouter;
export const useRouter = () => mockRouter;
export const useLocalSearchParams = () => ({});
export const useSegments = () => [];
export const usePathname = () => '/';
export const Link = ({ children }: { children: React.ReactNode }) => children;
export const Redirect = () => null;
export const Stack = ({ children }: { children: React.ReactNode }) => children;
Stack.Screen = () => null;
export const Tabs = ({ children }: { children: React.ReactNode }) => children;
Tabs.Screen = () => null;
export const Slot = () => null;
export const useFocusEffect = (cb: () => void) => {
  // Call the callback immediately for testing
  const { useEffect } = require('react');
  useEffect(() => {
    cb();
  }, []);
};
