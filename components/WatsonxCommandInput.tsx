import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Speech from "expo-speech";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Props = {
  onSubmit: (text: string) => void;
  loading?: boolean;
  status?: string;
};

const SUGGESTIONS = [
  "Move the welding cell closer to the dock by 6 ft",
  "Add a new CNC machine next to machining and keep aisles 10 ft wide",
  "Rotate pallet racks to improve forklift flow",
];

export function WatsonxCommandInput({ onSubmit, loading, status }: Props) {
  const [value, setValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [recognitionAvailable, setRecognitionAvailable] = useState(false);

  useEffect(() => {
    // Check if speech recognition is available
    checkSpeechRecognition();
  }, []);

  const checkSpeechRecognition = async () => {
    try {
      // On iOS, we'll use a different approach with expo-speech
      // For now, mark as available and show the button
      setRecognitionAvailable(true);
    } catch (error) {
      console.log("Speech recognition not available:", error);
      setRecognitionAvailable(false);
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  };

  const startVoiceInput = async () => {
    try {
      setIsListening(true);
      // Show alert for manual voice input since expo-speech doesn't have recognition on iOS
      Alert.prompt(
        "Voice Command",
        "Speak your command (this is a simulation - on a real device, use iOS dictation button on keyboard)",
        [
          {
            text: "Cancel",
            onPress: () => setIsListening(false),
            style: "cancel",
          },
          {
            text: "Submit",
            onPress: (text) => {
              if (text && text.trim()) {
                setValue(text);
                onSubmit(text.trim());
              }
              setIsListening(false);
            },
          },
        ],
        "plain-text"
      );
    } catch (error) {
      console.error("Voice input error:", error);
      Alert.alert("Error", "Voice input is not available");
      setIsListening(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 84 : 0}
      style={styles.keyboardAvoider}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Watsonx Command</Text>
          {status ? <Text style={styles.status}>{status}</Text> : null}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Tell Watsonx how to adjust the layout..."
          placeholderTextColor="#9fb3c8"
          value={value}
          onChangeText={setValue}
          multiline
        />

        <View style={styles.actions}>
          {recognitionAvailable && (
            <Pressable
              style={({ pressed }) => [
                styles.voiceButton,
                pressed && styles.voiceButtonPressed,
                isListening && styles.voiceButtonActive,
              ]}
              onPress={startVoiceInput}
              disabled={loading || isListening}
            >
              <MaterialCommunityIcons
                name={isListening ? "microphone" : "microphone-outline"}
                size={20}
                color={isListening ? "#ef4444" : "#00d4ff"}
              />
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              pressed && styles.sendButtonPressed,
            ]}
            onPress={handleSend}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0b0f24" />
            ) : (
              <Text style={styles.sendLabel}>Send to Watsonx</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.suggestions}>
          {SUGGESTIONS.map((suggestion) => (
            <Pressable
              key={suggestion}
              style={({ pressed }) => [
                styles.suggestionChip,
                pressed && styles.suggestionChipPressed,
              ]}
              onPress={() => {
                setValue(suggestion);
                onSubmit(suggestion);
              }}
              disabled={loading}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoider: {
    width: "100%",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f6fbff",
    letterSpacing: -0.2,
  },
  status: {
    fontSize: 12,
    color: "#9fb3c8",
    flexShrink: 1,
    textAlign: "right",
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    padding: 12,
    color: "#e9f0ff",
    minHeight: 64,
    backgroundColor: "rgba(0,0,0,0.15)",
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    alignItems: "center",
  },
  voiceButton: {
    backgroundColor: "rgba(0, 212, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 212, 255, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  voiceButtonActive: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  sendButton: {
    backgroundColor: "#00d4ff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
  },
  sendButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  sendLabel: {
    color: "#0b0f24",
    fontSize: 14,
    fontWeight: "700",
  },
  suggestions: {
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 10,
  },
  suggestionChipPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  suggestionText: {
    color: "#c8d5e8",
    fontSize: 13,
    lineHeight: 18,
  },
});
