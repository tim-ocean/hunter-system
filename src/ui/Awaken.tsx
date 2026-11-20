import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";

import { useGame } from "../store/game";
import { Btn, Field, Row, T, Win } from "./kit";
import { color } from "./theme";

/** First launch: the System offers to make you a Player. */
export function Awaken() {
  const { accept } = useGame();
  const [name, setName] = useState("");
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: color.void, justifyContent: "center", padding: 20 }}
    >
      <Win tag="NOTIFICATION" bang style={{ width: "100%", maxWidth: 440, alignSelf: "center" }}>
        <View style={{ gap: 6 }}>
          <T style={{ textAlign: "center", fontSize: 17 }}>A new Player has been detected.</T>
          <T style={{ textAlign: "center", fontSize: 17 }}>Begin your training?</T>
        </View>
        <Field
          label="Your name, Hunter"
          value={name}
          onChangeText={setName}
          placeholder="Alex"
          maxLength={40}
          autoComplete="nickname"
          returnKeyType="done"
          onSubmitEditing={() => accept(name)}
        />
        <Row style={{ justifyContent: "center" }}>
          <Btn label="Accept" size="lg" onPress={() => accept(name)} />
        </Row>
      </Win>
    </KeyboardAvoidingView>
  );
}
