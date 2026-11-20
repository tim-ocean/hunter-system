import { type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { color, font, space } from "./theme";

/* ---------- text ---------- */

type Variant = "body" | "dim" | "label" | "title" | "h3" | "mono" | "monoDim" | "big";

export function T({ v = "body", style, ...rest }: TextProps & { v?: Variant }) {
  return <Text {...rest} style={[styles[v], style]} />;
}

/** Renders **double-asterisk** spans in bold, the markup System notices use. */
export function Rich({ text, style }: { text: string; style?: TextProps["style"] }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text style={[styles.body, style]}>
      {parts.map((p, i) =>
        p.startsWith("**") ? (
          <Text key={i} style={{ fontFamily: font.bodySemi, color: "#fff" }}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

/* ---------- layout ---------- */

export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.void }}
      contentContainerStyle={{
        paddingTop: insets.top + space.lg,
        paddingBottom: space.xl * 2,
        paddingLeft: Math.max(space.lg, insets.left),
        paddingRight: Math.max(space.lg, insets.right),
        gap: 18,
        maxWidth: 760,
        width: "100%",
        alignSelf: "center",
      }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, alignItems: "center" }, style]}>{children}</View>;
}

/** A System window: glowing panel with corner brackets and a centered tag. */
export function Win({
  tag,
  bang,
  tone,
  children,
  style,
}: {
  tag?: string;
  bang?: boolean;
  tone?: "red";
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const accent = tone === "red" ? color.danger : color.glow;
  return (
    <View
      style={[
        styles.win,
        tone === "red" && { borderColor: "rgba(255, 65, 87, 0.7)", shadowColor: color.danger },
        style,
      ]}
    >
      <View style={[styles.corner, { top: -2, left: -2, borderTopWidth: 2, borderLeftWidth: 2, borderColor: accent }]} />
      <View style={[styles.corner, { bottom: -2, right: -2, borderBottomWidth: 2, borderRightWidth: 2, borderColor: accent }]} />
      {tag ? (
        <View style={styles.winHead}>
          {bang ? (
            <View style={[styles.bang, { borderColor: accent }]}>
              <Text style={[styles.bangText, { color: accent }]}>!</Text>
            </View>
          ) : null}
          <View style={[styles.tag, { borderColor: tone === "red" ? color.danger : "rgba(92, 200, 255, 0.6)" }]}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Rule() {
  return <View style={{ height: 1, backgroundColor: "rgba(92, 200, 255, 0.35)" }} />;
}

export function Bar({ value, max, tint = color.glow, height = 6 }: { value: number; max: number; tint?: string; height?: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={{ height, backgroundColor: color.faint, overflow: "hidden" }}>
      <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: tint, shadowColor: tint, shadowOpacity: 0.9, shadowRadius: 6 }} />
    </View>
  );
}

/* ---------- controls ---------- */

export function Btn({
  label,
  onPress,
  kind = "primary",
  size = "md",
  disabled,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "ghost" | "red";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const pad = { sm: [6, 10], md: [9, 14], lg: [13, 22] }[size];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        {
          paddingVertical: pad[0],
          paddingHorizontal: pad[1],
          borderWidth: 1,
          borderColor: kind === "red" ? color.danger : kind === "ghost" ? color.faint : "rgba(92, 200, 255, 0.6)",
          backgroundColor:
            kind === "ghost" ? "transparent" : kind === "red" ? "rgba(255, 65, 87, 0.14)" : "rgba(58, 141, 255, 0.14)",
          opacity: disabled ? 0.4 : 1,
        },
        pressed && { backgroundColor: kind === "red" ? "rgba(255, 65, 87, 0.3)" : "rgba(58, 141, 255, 0.3)" },
      ]}
    >
      <Text
        style={{
          fontFamily: font.display,
          letterSpacing: 1.6,
          textTransform: "uppercase",
          fontSize: size === "lg" ? 16 : size === "sm" ? 12 : 14,
          color: kind === "ghost" ? color.dim : color.text,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Pills<K extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: [K, string][];
  value: K;
  onChange: (v: K) => void;
  label?: string;
}) {
  return (
    <View style={{ gap: 6 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {label ? <T v="label">{label}</T> : null}
      <Row style={{ gap: 6 }}>
        {options.map(([k, text]) => {
          const on = k === value;
          return (
            <Pressable
              key={String(k)}
              onPress={() => onChange(k)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={{
                paddingVertical: 7,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: on ? color.glow : color.faint,
                backgroundColor: on ? "rgba(58, 141, 255, 0.18)" : "transparent",
              }}
            >
              <Text style={{ fontFamily: font.body, fontSize: 14, color: on ? color.text : color.dim }}>{text}</Text>
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}

export function Field({ label, hint, style, ...rest }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={[{ gap: 4, flexGrow: 1, flexBasis: 140, minWidth: 0 }, style as StyleProp<ViewStyle>]}>
      <T v="label">{label}</T>
      <TextInput
        placeholderTextColor={color.faint}
        selectionColor={color.glow}
        accessibilityLabel={label}
        {...rest}
        style={styles.input}
      />
      {hint ? <T v="dim" style={{ fontSize: 12 }}>{hint}</T> : null}
    </View>
  );
}

export function Stat({ label, value, text }: { label: string; value: string; text?: boolean }) {
  return (
    <View style={styles.stat}>
      <T v="dim" style={{ fontSize: 12 }}>{label}</T>
      <T v="mono" style={text ? { fontSize: 16, fontFamily: font.display } : { fontSize: 16, fontFamily: font.monoBold }}>{value}</T>
    </View>
  );
}

export const styles = StyleSheet.create({
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: color.text },
  dim: { fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.dim },
  label: { fontFamily: font.display, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: color.dim },
  title: { fontFamily: font.display, fontSize: 22, letterSpacing: 0.8, color: color.text, textAlign: "center" },
  h3: { fontFamily: font.display, fontSize: 18, letterSpacing: 0.6, color: color.text },
  mono: { fontFamily: font.mono, fontSize: 13, color: color.text },
  monoDim: { fontFamily: font.mono, fontSize: 12, color: color.dim },
  big: { fontFamily: font.displayBold, fontSize: 60, lineHeight: 62, color: "#fff", textShadowColor: color.glow, textShadowRadius: 16 },
  win: {
    backgroundColor: color.panel,
    borderWidth: 1,
    borderColor: color.line,
    padding: 18,
    gap: 14,
    shadowColor: "#3a8dff",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  corner: { position: "absolute", width: 14, height: 14 },
  winHead: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 },
  bang: { width: 22, height: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  bangText: { fontFamily: font.displayBold, fontSize: 14 },
  tag: { borderWidth: 1, paddingVertical: 3, paddingHorizontal: 14 },
  tagText: {
    fontFamily: font.displayBold,
    fontSize: 14,
    letterSpacing: 2.8,
    color: color.text,
    textShadowColor: color.glow,
    textShadowRadius: 10,
  },
  input: {
    fontFamily: font.body,
    fontSize: 16,
    color: color.text,
    backgroundColor: "rgba(6, 10, 19, 0.85)",
    borderWidth: 1,
    borderColor: color.faint,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  stat: {
    flexGrow: 1,
    flexBasis: 140,
    padding: 10,
    borderWidth: 1,
    borderColor: color.faint,
    backgroundColor: color.inset,
    gap: 2,
  },
});
