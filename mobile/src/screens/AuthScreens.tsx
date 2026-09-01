import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Screen } from "../components/Screen";
import { useAppStore } from "../store/useAppStore";
import type { AuthStackParams } from "../navigation/AppNavigator";

function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const authenticate = useAppStore((state) => state.authenticate);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <Screen>
      <AccessibleText variant="title" weight="800">{mode === "login" ? "Welcome back" : "Create your account"}</AccessibleText>
      <AccessibleText>{mode === "login" ? "Pick up where you left off." : "Your public profile will never show your email."}</AccessibleText>
      <Card>
        <Input accessibilityLabel="Email address" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email address" value={email} onChangeText={setEmail} />
        <Input accessibilityLabel="Password" autoCapitalize="none" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Password (12+ characters)" secureTextEntry value={password} onChangeText={setPassword} />
        <Button label={mode === "login" ? "Log in" : "Create account"} disabled={!email || password.length < 12} onPress={authenticate} />
      </Card>
      <Button label="Continue with Apple" variant="secondary" onPress={() => {}} />
      <Button label="Continue with Google" variant="secondary" onPress={() => {}} />
    </Screen>
  );
}

export function LoginScreen(_props: NativeStackScreenProps<AuthStackParams, "Login">) { return <AuthForm mode="login" />; }
export function SignupScreen(_props: NativeStackScreenProps<AuthStackParams, "Signup">) { return <AuthForm mode="signup" />; }
