import { useState } from "react";
import { Linking } from "react-native";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Screen } from "../components/Screen";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/colors";

export function TwoFactorSettingsScreen() {
  const enabled = useAppStore((state) => state.user?.twoFactorEnabled ?? false);
  const refresh = useAppStore((state) => state.refreshProfile);
  const [secret, setSecret] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const begin = async () => {
    setError(null);
    try {
      const response = await api<{ secret: string; provisioningUri: string }>("/auth/2fa/setup", { method: "POST" });
      setSecret(response.secret); setUri(response.provisioningUri);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Setup could not start"); }
  };
  const enable = async () => {
    setError(null);
    try { await api("/auth/2fa/enable", { method: "POST", body: JSON.stringify({ code }) }); await refresh(); setMessage("Two-factor authentication is on."); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Code could not be verified"); }
  };
  const disable = async () => {
    setError(null);
    try { await api("/auth/2fa/disable", { method: "POST", body: JSON.stringify({ code, ...(password ? { password } : {}) }) }); await refresh(); setCode(""); setPassword(""); setMessage("Two-factor authentication is off."); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Two-factor authentication could not be disabled"); }
  };

  return <Screen><AccessibleText variant="title" weight="800">Two-factor authentication</AccessibleText><AccessibleText color={colors.muted}>An authenticator app adds a six-digit check after your password. Spectrum never asks for this code in chat.</AccessibleText><Card>{enabled ? <><AccessibleText weight="700">Two-factor authentication is on</AccessibleText><Input accessibilityLabel="Current six-digit code" keyboardType="number-pad" maxLength={6} placeholder="000000" value={code} onChangeText={setCode} /><Input accessibilityLabel="Password to disable two-factor authentication" secureTextEntry placeholder="Password, if your account has one" value={password} onChangeText={setPassword} /><Button label="Turn off two-factor authentication" variant="danger" disabled={code.length !== 6} onPress={disable} /></> : secret ? <><AccessibleText weight="700">Add this account to your authenticator</AccessibleText><AccessibleText selectable>{secret}</AccessibleText>{uri ? <Button label="Open authenticator app" variant="secondary" onPress={() => void Linking.openURL(uri)} /> : null}<Input accessibilityLabel="Six-digit authenticator code" keyboardType="number-pad" maxLength={6} placeholder="000000" value={code} onChangeText={setCode} /><Button label="Confirm and turn on" disabled={code.length !== 6} onPress={enable} /></> : <Button label="Set up authenticator" onPress={begin} />}{message ? <AccessibleText>{message}</AccessibleText> : null}{error ? <AccessibleText accessibilityRole="alert" color={colors.error}>{error}</AccessibleText> : null}</Card></Screen>;
}
