import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useState } from "react";
import { Switch, View } from "react-native";

import { rename, setReminders } from "../../engine/game";
import { CLEAR_BONUS, DAILY_XP, GATE_CLEAR_MULT, GATE_LOG_XP, RANKS, RANK_XP } from "../../engine/rules";
import { usePlayer } from "../../store/game";
import { syncReminders } from "../../store/reminders";
import { Btn, Field, Row, Screen, T, Win } from "../../ui/kit";
import { color } from "../../ui/theme";

export default function SystemScreen() {
  const { state: s, act, restore, reset } = usePlayer();
  const [name, setName] = useState(s.name);
  const [backup, setBackup] = useState("");
  const [message, setMessage] = useState("");
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const toggleReminders = async (on: boolean) => {
    const ok = await syncReminders(on);
    act(setReminders(on && ok));
    if (on && !ok) setMessage("Notifications are off for this app. Turn them on in your phone's settings, then try again.");
  };

  return (
    <Screen>
      <Win tag="SYSTEM LOG">
        {s.log.length === 0 ? <T v="dim">Nothing logged yet.</T> : null}
        {s.log.slice(0, 60).map((l) => (
          <View key={l.t + l.msg} style={{ paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: color.faint, gap: 2 }}>
            <T v="monoDim" style={{ fontSize: 11 }}>
              {new Date(l.t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </T>
            <T style={{ fontSize: 14 }}>
              {l.msg}
              {l.xp ? <T v="mono" style={{ color: color.glow, fontSize: 12 }}>{`  +${l.xp} XP`}</T> : null}
            </T>
          </View>
        ))}
      </Win>

      <Win tag="SETTINGS">
        <Row style={{ justifyContent: "space-between" }}>
          <T v="dim" style={{ flex: 1, fontSize: 13 }}>
            {s.profile ? "Changed your schedule, equipment or goals? Retake the assessment to rebuild your program." : "Take the assessment to get a program built for you."}
          </T>
          <Btn label={s.profile ? "Retake assessment" : "Start assessment"} size="sm" onPress={() => router.push("/assessment")} />
        </Row>

        <Row style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T>Daily reminders</T>
            <T v="dim" style={{ fontSize: 13 }}>9:00 Daily Quest notice and a 21:00 penalty warning.</T>
          </View>
          <Switch
            value={s.reminders}
            onValueChange={toggleReminders}
            trackColor={{ true: "rgba(92,200,255,0.6)", false: color.faint }}
            thumbColor={s.reminders ? color.glow : color.dim}
            accessibilityLabel="Daily reminders"
          />
        </Row>

        <Row style={{ alignItems: "flex-end" }}>
          <Field label="Player name" value={name} onChangeText={setName} maxLength={40} style={{ flexBasis: 200 }} />
          <Btn label="Save" onPress={() => (act(rename(name)), setMessage("Name updated."))} />
        </Row>

        <Field
          label="Backup"
          value={backup}
          onChangeText={(t) => (setBackup(t), setConfirmRestore(false))}
          placeholder="Paste a backup here to restore it"
          multiline
          autoCorrect={false}
          autoCapitalize="none"
        />
        <Row>
          <Btn
            label="Copy backup"
            size="sm"
            onPress={async () => {
              await Clipboard.setStringAsync(JSON.stringify(s));
              setMessage("Backup copied. Keep it somewhere safe, like a note to yourself.");
            }}
          />
          <Btn
            label={confirmRestore ? "Replace everything with this backup" : "Restore from pasted backup"}
            kind={confirmRestore ? "red" : "ghost"}
            size="sm"
            disabled={!backup.trim()}
            onPress={() => {
              if (!confirmRestore) return setConfirmRestore(true);
              setConfirmRestore(false);
              setMessage(restore(backup) ? "Backup restored." : "That backup could not be read. Paste the full text from Copy backup.");
            }}
          />
        </Row>
        {message ? <T style={{ color: color.glow, fontSize: 13 }}>{message}</T> : null}

        <Row style={{ justifyContent: "space-between" }}>
          <T v="dim" style={{ flex: 1, fontSize: 13 }}>Progress is saved on this phone. Copy a backup now and then.</T>
          <Btn
            label={confirmReset ? "Confirm: erase all progress" : "Reset"}
            kind="red"
            size="sm"
            onPress={() => {
              if (!confirmReset) return setConfirmReset(true);
              syncReminders(false);
              reset();
            }}
          />
        </Row>
      </Win>

      <Win tag="RULES">
        <T v="dim">
          Daily goal: {DAILY_XP} XP. Clearing all of the day's goals: +{CLEAR_BONUS} XP split across Body, Mind and Wealth.
        </T>
        <T v="dim">
          Quests pay by rank: {RANKS.map((r) => `${r} ${RANK_XP[r]}`).join(" · ")} XP. Gates pay {GATE_LOG_XP} XP per logged attack and {GATE_CLEAR_MULT}× the rank on clear.
        </T>
        <T v="dim">Miss a day and the System issues a Penalty Quest. XP is halved until you clear it, and your streak resets.</T>
        <T v="dim">
          Every 7 days the Weekly Assessment asks for your weight. Finish 85% of your goals and targets rise one stage; under 50% and they ease off. Calories adjust if you lose too fast or stall.
        </T>
        <T v="dim">Hunter rank follows your level: E (1), D (10), C (20), B (35), A (50), S (70).</T>
      </Win>
    </Screen>
  );
}
