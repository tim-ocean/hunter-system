import { Modal, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGame } from "../store/game";
import { Btn, Rich, Row, T, Win, styles } from "./kit";
import { color, font } from "./theme";

export function Toasts() {
  const { toasts } = useGame();
  const insets = useSafeAreaInsets();
  if (!toasts.length) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, gap: 8, alignItems: "center" }}>
      {toasts.map((t) => (
        <View
          key={t.id}
          accessibilityLiveRegion="polite"
          style={{
            width: "100%",
            maxWidth: 440,
            flexDirection: "row",
            gap: 10,
            alignItems: "center",
            padding: 12,
            backgroundColor: "rgba(8, 16, 32, 0.97)",
            borderWidth: 1,
            borderColor: color.line,
          }}
        >
          <View style={[styles.bang, { borderColor: color.glow, width: 18, height: 18 }]}>
            <T style={[styles.bangText, { color: color.glow, fontSize: 12 }]}>!</T>
          </View>
          <T style={{ flex: 1, fontSize: 14 }}>{t.text}</T>
        </View>
      ))}
    </View>
  );
}

export function NoticeModal() {
  const { notice, dismissNotice } = useGame();
  return (
    <Modal visible={!!notice} transparent animationType="fade" onRequestClose={dismissNotice} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(2, 4, 10, 0.82)", justifyContent: "center", padding: 20 }}>
        {notice ? (
          <Win tag={notice.head} bang tone={notice.tone} style={{ maxHeight: "90%", width: "100%", maxWidth: 440, alignSelf: "center" }}>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              {notice.huge ? (
                <T
                  style={{
                    fontFamily: font.displayBold,
                    fontSize: 42,
                    letterSpacing: 3,
                    color: "#fff",
                    textAlign: "center",
                    textShadowColor: notice.tone === "red" ? color.danger : color.glow,
                    textShadowRadius: 18,
                  }}
                >
                  {notice.huge}
                </T>
              ) : null}
              {notice.sub ? <T v="dim" style={{ textAlign: "center" }}>{notice.sub}</T> : null}
              {notice.lines?.map((l, i) => <Rich key={i} text={l} />)}
              {notice.note ? <T v="dim" style={{ fontSize: 13 }}>{notice.note}</T> : null}
            </ScrollView>
            <Row style={{ justifyContent: "center" }}>
              <Btn label="Confirm" size="lg" kind={notice.tone === "red" ? "red" : "primary"} onPress={dismissNotice} />
            </Row>
          </Win>
        ) : null}
      </View>
    </Modal>
  );
}
