import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSignIn, useSSO } from '@clerk/clerk-expo';
import { colors, type as typography, spacing, radius } from '@/constants/theme';
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { signIn, setActive } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    if (!signIn) return;
    setLoading(true);
    try {
      const redirectUrl = Platform.OS === 'web'
        ? window.location.origin
        : Linking.createURL('/oauth-callback');

      const { createdSessionId } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl,
      });
      if (createdSessionId) {
        await setActive!({ session: createdSessionId });
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.wordmark}>snapchef</Text>
        <Text style={styles.headline}>A little kitchen,</Text>
        <Text style={styles.headlineAccent}>curated for you</Text>
        <Text style={styles.subline}>
          Find recipes that match the ingredients you already have on your counter.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.googleButton, loading && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleText}>
            {loading ? 'Signing in…' : 'Continue with Google'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.emailButton}>
          <Text style={styles.emailText}>Continue with email</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By signing in you agree to our terms
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    justifyContent: 'space-between',
    padding: 32,
    paddingTop: 160,
  },
  hero: {
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: 'Fraunces',
    fontSize: 56,
    fontWeight: '400',
    fontStyle: 'italic',
    color: colors.tc600,
    marginBottom: 16,
  },
  headline: {
    fontFamily: 'Fraunces',
    fontSize: 28,
    fontWeight: '400',
    color: colors.ink,
    textAlign: 'center',
  },
  headlineAccent: {
    fontFamily: 'Fraunces',
    fontSize: 28,
    fontWeight: '300',
    fontStyle: 'italic',
    color: colors.tc600,
    textAlign: 'center',
    marginBottom: 12,
  },
  subline: {
    ...typography.body,
    color: colors.inkSoft,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  actions: {
    paddingBottom: 48,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: radius.pill,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285f4',
    marginRight: 12,
  },
  googleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  emailButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.creamDeep,
    borderRadius: radius.pill,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  emailText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  disclaimer: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 13,
    color: colors.inkMute,
  },
});
