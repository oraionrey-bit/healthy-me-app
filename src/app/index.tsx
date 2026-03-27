import { Redirect } from 'expo-router';

/**
 * Entry point — skip auth for now during development.
 * Auth is built and works (magic link), just bypassing
 * so Tina can test screens without logging in every deploy.
 * TODO: Re-enable auth check when app is more stable.
 */
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
