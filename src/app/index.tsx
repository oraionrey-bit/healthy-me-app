import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { useUserProfile } from '../hooks/use-user-profile';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/theme';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { isOnboarded, loading: profileLoading } = useUserProfile();

  if (authLoading || (user && profileLoading)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.purple} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!isOnboarded) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return <Redirect href="/(tabs)" />;
}
