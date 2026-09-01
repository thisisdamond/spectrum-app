import { useState } from "react";
import { Linking, Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Screen } from "../components/Screen";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/colors";
import type { AuthStackParams } from "../navigation/AppNavigator";

WebBrowser.maybeCompleteAuthSession();

function ErrorMessage({ message }: { message: string | null }) {
  return message ? <AccessibleText color={colors.error} accessibilityRole="alert">{message}</AccessibleText> : null;
}

function SocialButtons() {
  const socialLogin = useAppStore((state) => state.socialLogin);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const googleConfigured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  const [googleRequest, , promptGoogle] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "spectrum-unconfigured",
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "spectrum-unconfigured",
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "spectrum-unconfigured",
  });

  const withBusy = async (action: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await action(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Sign-in did not finish"); }
    finally { setBusy(false); }
  };

  const signInWithApple = () => withBusy(async () => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL, AppleAuthentication.AppleAuthenticationScope.FULL_NAME],
    });
    if (!credential.identityToken) throw new Error("Apple did not return an identity token");
    await socialLogin("APPLE", credential.identityToken);
  });

  const signInWithGoogle = () => withBusy(async () => {
    const result = await promptGoogle();
    if (result.type !== "success" || !result.params.id_token) throw new Error("Google sign-in was canceled");
    await socialLogin("GOOGLE", result.params.id_token);
  });

  return (
    <>
      {Platform.OS === "ios" ? <Button label="Continue with Apple" variant="secondary" disabled={busy} onPress={signInWithApple} /> : null}
      <Button label={googleConfigured ? "Continue with Google" : "Google sign-in needs app configuration"} variant="secondary" disabled={busy || !googleConfigured || !googleRequest} onPress={signInWithGoogle} />
      <ErrorMessage message={error} />
    </>
  );
}

export function LoginScreen({ navigation }: NativeStackScreenProps<AuthStackParams, "Login">) {
  const login = useAppStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setError(null);
    try { if (await login(email, password) === "twoFactor") navigation.navigate("TwoFactor"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Login failed"); }
    finally { setBusy(false); }
  };
  return (
    <Screen>
      <AccessibleText variant="title" weight="800">Welcome back</AccessibleText>
      <AccessibleText>Pick up where you left off.</AccessibleText>
      <Card>
        <Input accessibilityLabel="Email address" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email address" value={email} onChangeText={setEmail} />
        <Input accessibilityLabel="Password" autoCapitalize="none" autoComplete="current-password" placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <ErrorMessage message={error} />
        <Button label={busy ? "Logging in…" : "Log in"} disabled={busy || !email || password.length < 12} onPress={submit} />
        <Button label="Forgot password" variant="quiet" onPress={() => navigation.navigate("ForgotPassword")} />
      </Card>
      <SocialButtons />
    </Screen>
  );
}

export function SignupScreen({ navigation }: NativeStackScreenProps<AuthStackParams, "Signup">) {
  const register = useAppStore((state) => state.register);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setError(null);
    try { await register(email, password); navigation.navigate("VerifyEmail"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Account creation failed"); }
    finally { setBusy(false); }
  };
  return (
    <Screen>
      <AccessibleText variant="title" weight="800">Create your account</AccessibleText>
      <AccessibleText>Your public profile will never show your email.</AccessibleText>
      <Card>
        <Input accessibilityLabel="Email address" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email address" value={email} onChangeText={setEmail} />
        <Input accessibilityLabel="Password" autoCapitalize="none" autoComplete="new-password" placeholder="Password (12+ characters)" secureTextEntry value={password} onChangeText={setPassword} />
        <AccessibleText variant="caption" color={colors.muted}>Use at least 12 characters. A password manager is encouraged.</AccessibleText>
        <ErrorMessage message={error} />
        <Button label={busy ? "Creating account…" : "Create account"} disabled={busy || !email || password.length < 12} onPress={submit} />
      </Card>
      <SocialButtons />
    </Screen>
  );
}

export function VerifyEmailScreen(_props: NativeStackScreenProps<AuthStackParams, "VerifyEmail">) {
  const verifyEmail = useAppStore((state) => state.verifyEmail);
  const resend = useAppStore((state) => state.resendVerification);
  const email = useAppStore((state) => state.pendingEmail);
  const previewUrl = useAppStore((state) => state.pendingPreviewUrl);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setError(null);
    try { await verifyEmail(token); } catch (caught) { setError(caught instanceof Error ? caught.message : "Verification failed"); }
  };
  return (
    <Screen>
      <AccessibleText variant="title" weight="800">Check your email</AccessibleText>
      <AccessibleText>We sent a private verification link{email ? ` to ${email}` : ""}. You can also paste its token below.</AccessibleText>
      <Card>
        <Input accessibilityLabel="Verification token" autoCapitalize="none" placeholder="Verification token" value={token} onChangeText={setToken} />
        <ErrorMessage message={error} />
        {message ? <AccessibleText>{message}</AccessibleText> : null}
        <Button label="Verify email" disabled={token.length < 20} onPress={submit} />
        <Button label="Send a new link" variant="secondary" onPress={() => void resend().then(() => setMessage("A new link was prepared.")).catch((caught) => setError(caught.message))} />
        {previewUrl ? <Button label="Open development preview link" variant="quiet" onPress={() => void Linking.openURL(previewUrl)} /> : null}
      </Card>
    </Screen>
  );
}

export function ForgotPasswordScreen({ navigation }: NativeStackScreenProps<AuthStackParams, "ForgotPassword">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setError(null);
    try {
      const response = await api<{ previewUrl?: string }>("/auth/password/forgot", { method: "POST", body: JSON.stringify({ email }) });
      const previewToken = response.previewUrl ? new URL(response.previewUrl).searchParams.get("token") ?? undefined : undefined;
      navigation.navigate("ResetPassword", previewToken ? { token: previewToken } : {});
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Request failed"); }
  };
  return <Screen><AccessibleText variant="title" weight="800">Reset your password</AccessibleText><AccessibleText>If an account exists, we’ll send a reset link. This keeps account membership private.</AccessibleText><Card><Input accessibilityLabel="Email address" autoCapitalize="none" keyboardType="email-address" placeholder="Email address" value={email} onChangeText={setEmail} /><ErrorMessage message={error} /><Button label="Send reset link" disabled={!email} onPress={submit} /></Card></Screen>;
}

export function ResetPasswordScreen({ navigation, route }: NativeStackScreenProps<AuthStackParams, "ResetPassword">) {
  const [token, setToken] = useState(route.params?.token ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setError(null);
    try { await api<void>("/auth/password/reset", { method: "POST", body: JSON.stringify({ token, password }) }); navigation.popTo("Login"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Reset failed"); }
  };
  return <Screen><AccessibleText variant="title" weight="800">Choose a new password</AccessibleText><Card><Input accessibilityLabel="Reset token" autoCapitalize="none" placeholder="Reset token" value={token} onChangeText={setToken} /><Input accessibilityLabel="New password" autoComplete="new-password" placeholder="New password (12+ characters)" secureTextEntry value={password} onChangeText={setPassword} /><ErrorMessage message={error} /><Button label="Update password" disabled={token.length < 20 || password.length < 12} onPress={submit} /></Card></Screen>;
}

export function TwoFactorScreen() {
  const verifyCode = useAppStore((state) => state.verifyTwoFactor);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  return <Screen><AccessibleText variant="title" weight="800">Authenticator check</AccessibleText><AccessibleText>Enter the six-digit code from your authenticator app.</AccessibleText><Card><Input accessibilityLabel="Six-digit authenticator code" keyboardType="number-pad" maxLength={6} placeholder="000000" value={code} onChangeText={setCode} /><ErrorMessage message={error} /><Button label="Verify" disabled={code.length !== 6} onPress={() => void verifyCode(code).catch((caught) => setError(caught.message))} /></Card></Screen>;
}
