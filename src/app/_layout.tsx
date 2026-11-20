import { Barlow_400Regular } from "@expo-google-fonts/barlow/400Regular";
import { Barlow_500Medium } from "@expo-google-fonts/barlow/500Medium";
import { Barlow_600SemiBold } from "@expo-google-fonts/barlow/600SemiBold";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono/400Regular";
import { JetBrainsMono_600SemiBold } from "@expo-google-fonts/jetbrains-mono/600SemiBold";
import { SairaCondensed_600SemiBold } from "@expo-google-fonts/saira-condensed/600SemiBold";
import { SairaCondensed_700Bold } from "@expo-google-fonts/saira-condensed/700Bold";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { GameProvider, useGame } from "../store/game";
import { Awaken } from "../ui/Awaken";
import { NoticeModal, Toasts } from "../ui/overlays";
import { color } from "../ui/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_600SemiBold,
    SairaCondensed_600SemiBold,
    SairaCondensed_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <GameProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: color.void }}>
          <Root />
          <NoticeModal />
          <Toasts />
        </View>
      </GameProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const { state } = useGame();
  if (!state) return <Awaken />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.void } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="assessment" options={{ presentation: "modal" }} />
    </Stack>
  );
}
