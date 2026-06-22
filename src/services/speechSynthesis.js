import React, { useState, useEffect, useCallback, useRef } from "react";

const AudioPlayer = ({ text }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [speechRate, setSpeechRate] = useState(1);
  const [speechPitch, setSpeechPitch] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const utteranceRef = useRef(null);
  const isMountedRef = useRef(true);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !selectedVoice) {
        // Try to find a working voice
        const preferredVoices = [
          "Google UK English Male",
          "Google US English",
          "Microsoft David Desktop",
          "Microsoft Zira Desktop",
          "Samantha",
          "Alex",
          "Victoria",
          "Microsoft Aria Online (Natural) - English (United States)",
        ];

        let foundVoice = null;
        for (const name of preferredVoices) {
          foundVoice = availableVoices.find((v) => v.name.includes(name));
          if (foundVoice) break;
        }

        if (!foundVoice) {
          foundVoice = availableVoices.find((v) => v.lang.startsWith("en"));
        }

        setSelectedVoice(foundVoice || availableVoices[0]);
        setIsReady(true);
        console.log("✅ TTS ready with voice:", foundVoice?.name);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
      isMountedRef.current = false;
    };
  }, []);

  // SPEAK FUNCTION - The actual working one
  const speak = useCallback(() => {
    if (!text || text.length === 0) {
      setError("No text to speak.");
      return;
    }

    if (!isReady) {
      setError("TTS engine is not ready.");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    const cleanText = text
      .replace(/\s+/g, " ")
      .replace(/[^\w\s.,!?;:()"'-]/g, " ")
      .trim();

    if (cleanText.length === 0) {
      setError("No readable text found");
      return;
    }

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = 1;
    utterance.lang = selectedVoice?.lang || "en-US";

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Store reference
    utteranceRef.current = utterance;

    // Event handlers
    utterance.onstart = () => {
      console.log("🔊 Speaking started");
      setIsSpeaking(true);
      setError(null);
    };

    utterance.onend = () => {
      console.log("✅ Speaking ended");
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error("❌ Speech error:", event.error);
      setIsSpeaking(false);

      // If error is 'not-allowed', try to resume
      if (event.error === "not-allowed") {
        setError("Speech not allowed. Please check browser permissions.");
        return;
      }

      // For other errors, try to resume
      if (event.error !== "interrupted" && event.error !== "canceled") {
        setError("Speech error: " + event.error);
      }
    };

    // CRITICAL: Resume audio context if needed
    if (window.speechSynthesis) {
      try {
        // This forces the audio context to resume
        const audioContext = new (
          window.AudioContext || window.webkitAudioContext
        )();
        if (audioContext.state === "suspended") {
          audioContext.resume().then(() => {
            console.log("🎵 Audio context resumed");
          });
        }
      } catch (e) {
        console.warn("Audio context resume failed:", e);
      }
    }

    // Speak!
    console.log("🔊 Speaking text:", cleanText.substring(0, 100) + "...");
    window.speechSynthesis.speak(utterance);
  }, [text, selectedVoice, speechRate, speechPitch, isReady]);

  // Stop speaking
  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    console.log("⏹️ Stopped");
  }, []);

  // Test speech
  const testSpeech = useCallback(() => {
    window.speechSynthesis.cancel();

    const testText = "Hello, this is a test. Can you hear me?";
    const utterance = new SpeechSynthesisUtterance(testText);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      console.log("🔊 Test started");
      setError(null);
    };

    utterance.onend = () => {
      console.log("✅ Test complete");
      alert("✅ Test complete! If you heard the message, speech is working.");
    };

    utterance.onerror = (e) => {
      console.error("❌ Test error:", e);
      alert(
        "❌ Test failed: " +
          e.error +
          "\n\nTry:\n1. Check system volume\n2. Try Chrome browser\n3. Restart browser",
      );
    };

    window.speechSynthesis.speak(utterance);
  }, [selectedVoice]);

  const textPreview =
    text && text.length > 100 ? text.substring(0, 100) + "..." : text;

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="font-semibold text-gray-700 mb-3">🔊 Listen to Text</h3>

      <div
        className={`mb-4 px-4 py-2 rounded ${
          isReady
            ? "bg-green-50 border border-green-300 text-green-700"
            : "bg-yellow-50 border border-yellow-300 text-yellow-700"
        }`}
      >
        <span className="text-sm">
          {isReady
            ? `✅ TTS ready (${voices.length} voices)`
            : "⏳ Loading voices..."}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-2 rounded mb-4">
          <strong>Error:</strong> {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {text && (
        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mb-4">
          <strong>Text:</strong> {textPreview}
          <div className="text-xs text-gray-400 mt-1">
            {text.length} characters (~{Math.round(text.length / 5)} words)
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={speak}
          disabled={!text || isSpeaking || !isReady}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            text && !isSpeaking && isReady
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : "bg-gray-300 cursor-not-allowed text-gray-500"
          }`}
        >
          {isSpeaking ? "🔊 Speaking..." : "▶️ Listen"}
        </button>

        <button
          onClick={stop}
          disabled={!isSpeaking}
          className={`py-2 px-4 rounded-lg font-medium transition-colors ${
            isSpeaking
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-gray-300 cursor-not-allowed text-gray-500"
          }`}
        >
          ⏹️ Stop
        </button>
      </div>

      <button
        onClick={testSpeech}
        disabled={!isReady}
        className="w-full mb-4 py-1.5 px-4 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        🧪 Test Speech
      </button>

      <div className="border rounded-lg p-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Voice Settings
        </h4>

        <div className="mb-2">
          <label className="text-sm text-gray-600 block mb-1">Voice</label>
          <select
            value={selectedVoice?.name || ""}
            onChange={(e) => {
              const voice = voices.find((v) => v.name === e.target.value);
              setSelectedVoice(voice);
            }}
            className="w-full border rounded px-2 py-1 text-sm"
            disabled={voices.length === 0}
          >
            {voices.length === 0 && <option value="">Loading voices...</option>}
            {voices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>

        <div className="mb-2">
          <label className="text-sm text-gray-600 block mb-1">
            Speed: {speechRate}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={speechRate}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">
            Pitch: {speechPitch}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={speechPitch}
            onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      <div className="text-xs text-gray-400 text-center mt-3 space-y-1">
        <span className="block text-green-600 font-medium">
          ✅ 100% Free - No Downloads, No API Keys!
        </span>
        <span className="block">
          Uses Web Speech API - Just listens to the text
        </span>
        <span className="block text-red-500 font-medium">
          ⚠️ If you can't hear anything:
        </span>
        <span className="block text-xs text-gray-500">
          1. Check your system volume is up
        </span>
        <span className="block text-xs text-gray-500">
          2. Make sure speakers/headphones are connected
        </span>
        <span className="block text-xs text-gray-500">
          3. Try Chrome browser
        </span>
        <span className="block text-xs text-gray-500">
          4. Try a different voice from the dropdown
        </span>
        <span className="block text-xs text-gray-500">
          5. Click "Test Speech" to verify
        </span>
      </div>
    </div>
  );
};

export default AudioPlayer;
