import React, { useState, useEffect, useCallback, useRef } from "react";

const AudioPlayer = ({ text }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [speechRate, setSpeechRate] = useState(1);
  const [speechPitch, setSpeechPitch] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [showContinue, setShowContinue] = useState(false);

  const isMountedRef = useRef(true);
  const isSpeakingRef = useRef(false);
  const speechQueueRef = useRef([]);
  const isProcessingRef = useRef(false);
  const audioContextRef = useRef(null);
  const currentVoiceRef = useRef(null);
  const progressSavedRef = useRef(false);

  const MAX_CHUNK = 2000;
  const DELAY_BETWEEN_CHUNKS = 300;

  // ====== SAVE PROGRESS TO LOCAL STORAGE ======
  const saveProgress = useCallback(
    (chunkIndex, progressPercent, total) => {
      try {
        const textHash = text ? text.substring(0, 200) : "";
        localStorage.setItem(
          "audioProgress",
          JSON.stringify({
            chunkIndex,
            progress: progressPercent,
            totalChunks: total,
            textHash: textHash,
            timestamp: Date.now(),
          }),
        );
        console.log(
          `💾 Progress saved: ${progressPercent}% (chunk ${chunkIndex}/${total})`,
        );
        progressSavedRef.current = true;
      } catch (e) {
        console.warn("Failed to save audio progress:", e);
      }
    },
    [text],
  );

  // ====== LOAD PROGRESS FROM LOCAL STORAGE ======
  const loadProgress = useCallback(() => {
    try {
      const saved = localStorage.getItem("audioProgress");
      if (saved) {
        const data = JSON.parse(saved);
        const textHash = text ? text.substring(0, 200) : "";
        // Check if saved progress is for the current text
        if (data.textHash === textHash) {
          setCurrentChunkIndex(data.chunkIndex || 0);
          setProgress(data.progress || 0);
          setTotalChunks(data.totalChunks || 0);
          if (data.chunkIndex > 0 && data.chunkIndex < data.totalChunks) {
            setShowContinue(true);
          }
          console.log(
            `✅ Audio progress loaded: ${data.progress}% (chunk ${data.chunkIndex}/${data.totalChunks})`,
          );
          return data.chunkIndex || 0;
        } else {
          // Different text, clear old progress
          localStorage.removeItem("audioProgress");
          console.log("🔄 Different text detected, progress reset");
        }
      }
    } catch (e) {
      console.warn("Failed to load audio progress:", e);
    }
    return 0;
  }, [text]);

  // ====== RESET PROGRESS ======
  const resetProgress = useCallback(() => {
    localStorage.removeItem("audioProgress");
    setCurrentChunkIndex(0);
    setProgress(0);
    setTotalChunks(0);
    setShowContinue(false);
    console.log("🔄 Audio progress reset");
  }, []);

  // ====== LOAD PROGRESS ON MOUNT ======
  useEffect(() => {
    if (text && isReady) {
      loadProgress();
    }
  }, [text, isReady, loadProgress]);

  // ====== LOAD VOICES ======
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0) {
        setSelectedVoice((prev) => {
          if (prev) return prev;
          const preferred = availableVoices.find(
            (v) =>
              v.name.includes("Google") ||
              v.name.includes("Microsoft") ||
              v.name.includes("Samantha") ||
              v.name.includes("Alex") ||
              v.name.includes("Aria") ||
              v.name.includes("David") ||
              v.name.includes("Zira"),
          );
          const englishVoice = availableVoices.find((v) =>
            v.lang.startsWith("en"),
          );
          return preferred || englishVoice || availableVoices[0];
        });
        setIsReady(true);
        console.log("✅ TTS ready with", availableVoices.length, "voices");
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    try {
      audioContextRef.current = new (
        window.AudioContext || window.webkitAudioContext
      )();
    } catch (e) {
      console.warn("AudioContext not available");
    }

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
      isMountedRef.current = false;
      isSpeakingRef.current = false;
      isProcessingRef.current = false;
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleVoiceChange = useCallback((voice) => {
    console.log("🎤 Changing voice to:", voice?.name);

    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    isProcessingRef.current = false;
    speechQueueRef.current = [];

    setSelectedVoice(voice);
    currentVoiceRef.current = voice;
    setError(null);

    setTimeout(() => {
      try {
        if (
          audioContextRef.current &&
          audioContextRef.current.state === "suspended"
        ) {
          audioContextRef.current.resume();
        }
      } catch (e) {
        // Ignore
      }
      console.log("🎤 Voice changed to:", voice?.name);
    }, 100);
  }, []);

  const ensureAudioContext = useCallback(() => {
    try {
      if (
        audioContextRef.current &&
        audioContextRef.current.state === "suspended"
      ) {
        audioContextRef.current.resume();
        console.log("🎵 AudioContext resumed");
      }
    } catch (e) {
      console.warn("Could not resume AudioContext:", e);
    }
  }, []);

  const processQueue = useCallback(() => {
    if (isProcessingRef.current) return;
    if (speechQueueRef.current.length === 0) {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      isProcessingRef.current = false;
      setProgress(100);
      console.log("✅ All chunks complete");
      saveProgress(totalChunks, 100, totalChunks);
      return;
    }

    ensureAudioContext();

    isProcessingRef.current = true;
    const chunk = speechQueueRef.current.shift();

    try {
      if (audioContextRef.current) {
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        gain.gain.value = 0.001;
        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);
        osc.start(0);
        osc.stop(0.001);
      }
    } catch (e) {
      // Ignore
    }

    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = 1;

    const voiceToUse = currentVoiceRef.current || selectedVoice;
    if (voiceToUse) {
      utterance.voice = voiceToUse;
      utterance.lang = voiceToUse.lang;
    } else {
      utterance.lang = "en-US";
    }

    utterance.onstart = () => {
      console.log("🔊 Speaking chunk...");
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      setError(null);
      setShowContinue(false);
    };

    utterance.onend = () => {
      console.log("✅ Chunk complete");
      const total = totalChunks || speechQueueRef.current.length + 1;
      const done = total - speechQueueRef.current.length;
      const progressPercent = Math.round((done / total) * 100);
      setProgress(progressPercent);
      setCurrentChunkIndex(done);
      // SAVE PROGRESS HERE!
      saveProgress(done, progressPercent, total);

      isProcessingRef.current = false;
      setTimeout(() => {
        processQueue();
      }, DELAY_BETWEEN_CHUNKS);
    };

    utterance.onerror = (event) => {
      if (event.error === "interrupted" || event.error === "canceled") {
        console.log("⏹️ Speech was stopped (normal)");
        // Save progress when stopped
        const total = totalChunks || 1;
        const done = currentChunkIndex || 0;
        const progressPercent = Math.round((done / total) * 100);
        saveProgress(done, progressPercent, total);
        speechQueueRef.current = [];
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        isProcessingRef.current = false;
        return;
      }

      console.error("❌ Speech error:", event.error);
      isProcessingRef.current = false;
      processQueue();
    };

    window.speechSynthesis.speak(utterance);
  }, [
    selectedVoice,
    speechRate,
    speechPitch,
    ensureAudioContext,
    totalChunks,
    currentChunkIndex,
    saveProgress,
  ]);

  // ====== SPEAK FUNCTION ======
  const speak = useCallback(() => {
    if (!text || text.length === 0) {
      setError("No text to speak.");
      return;
    }

    if (!isReady) {
      setError("TTS engine is not ready.");
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    isProcessingRef.current = false;
    speechQueueRef.current = [];

    setTimeout(() => {
      const cleanText = text
        .replace(/\s+/g, " ")
        .replace(/[^\w\s.,!?;:()"'-]/g, " ")
        .trim();

      if (cleanText.length === 0) {
        setError("No readable text found");
        return;
      }

      const chunks = [];
      for (let i = 0; i < cleanText.length; i += MAX_CHUNK) {
        chunks.push(cleanText.substring(i, i + MAX_CHUNK));
      }

      setTotalChunks(chunks.length);

      // Check if we should resume from saved progress
      const savedIndex = loadProgress();
      if (savedIndex > 0 && savedIndex < chunks.length) {
        // Resume from saved position
        speechQueueRef.current = chunks.slice(savedIndex);
        setCurrentChunkIndex(savedIndex);
        const progressPercent = Math.round((savedIndex / chunks.length) * 100);
        setProgress(progressPercent);
        console.log(
          `▶️ Resuming from ${progressPercent}% (chunk ${savedIndex})`,
        );
      } else {
        // Start from beginning
        speechQueueRef.current = chunks;
        setCurrentChunkIndex(0);
        setProgress(0);
        // Reset saved progress if starting from beginning
        if (savedIndex === 0) {
          localStorage.removeItem("audioProgress");
        }
      }

      ensureAudioContext();

      setTimeout(() => {
        processQueue();
      }, 100);
    }, 150);
  }, [text, isReady, processQueue, ensureAudioContext, loadProgress]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    // Save progress when stopped
    const total = totalChunks || 1;
    const done = currentChunkIndex || 0;
    const progressPercent = Math.round((done / total) * 100);
    saveProgress(done, progressPercent, total);

    speechQueueRef.current = [];
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    isProcessingRef.current = false;
    console.log("⏹️ Stopped");
  }, [totalChunks, currentChunkIndex, saveProgress]);

  const testSpeech = useCallback(() => {
    ensureAudioContext();

    window.speechSynthesis.cancel();
    speechQueueRef.current = [];
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    isProcessingRef.current = false;

    setTimeout(() => {
      try {
        if (audioContextRef.current) {
          const osc = audioContextRef.current.createOscillator();
          const gain = audioContextRef.current.createGain();
          gain.gain.value = 0.001;
          osc.connect(gain);
          gain.connect(audioContextRef.current.destination);
          osc.start(0);
          osc.stop(0.001);
        }
      } catch (e) {
        // Ignore
      }

      const testText = "Hello, this is a test. Can you hear me?";
      const utterance = new SpeechSynthesisUtterance(testText);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voiceToUse = currentVoiceRef.current || selectedVoice;
      if (voiceToUse) {
        utterance.voice = voiceToUse;
        console.log("🔊 Test using voice:", voiceToUse.name);
      }

      utterance.onstart = () => {
        console.log("🔊 Test started");
        setIsSpeaking(true);
        setError(null);
      };

      utterance.onend = () => {
        console.log("✅ Test complete");
        setIsSpeaking(false);
        alert("✅ Test complete! If you heard the message, speech is working.");
      };

      utterance.onerror = (e) => {
        if (e.error === "interrupted" || e.error === "canceled") {
          console.log("⏹️ Test was stopped (normal)");
          setIsSpeaking(false);
          return;
        }
        console.error("❌ Test error:", e);
        setIsSpeaking(false);
        alert("❌ Test failed: " + e.error);
      };

      window.speechSynthesis.speak(utterance);
    }, 200);
  }, [selectedVoice, ensureAudioContext]);

  const textPreview =
    text && text.length > 100 ? text.substring(0, 100) + "..." : text;

  const getLanguageFlag = (langCode) => {
    const code = langCode.substring(0, 2);
    const flags = {
      en: "🇬🇧",
      de: "🇩🇪",
      es: "🇪🇸",
      fr: "🇫🇷",
      ru: "🇷🇺",
    };
    return flags[code] || "🌐";
  };

  const estimatedMinutes = text
    ? Math.round(((text.length / 2000) * 2) / 60)
    : 0;

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
        {text && (
          <span className="text-xs block text-gray-500 mt-1">
            📄 {text.length.toLocaleString()} chars |{" "}
            {Math.ceil(text.length / 2000)} chunks | ~{estimatedMinutes} min
          </span>
        )}
        {selectedVoice && (
          <span className="text-xs block text-blue-500 mt-1">
            🎤 Voice: {selectedVoice.name} {getLanguageFlag(selectedVoice.lang)}{" "}
            {selectedVoice.localService ? "(Local ✅)" : "(Online 🌐)"}
          </span>
        )}
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
            {text.length.toLocaleString()} characters (~
            {Math.round(text.length / 5).toLocaleString()} words)
          </div>
        </div>
      )}

      {/* PROGRESS BAR */}
      {(isSpeaking || progress > 0) && totalChunks > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* CONTINUE BUTTON */}
      {showContinue && !isSpeaking && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
          <p className="text-sm text-yellow-700">
            ⏸️ You left off at {progress}%
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                setShowContinue(false);
                speak();
              }}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
            >
              ▶️ Continue
            </button>
            <button
              onClick={resetProgress}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm"
            >
              🔄 Start Over
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={speak}
          disabled={!text || isSpeaking || !isReady}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            text && !isSpeaking && isReady
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : "bg-gray-300 cursor-not-allowed text-gray-500"
          }`}
        >
          {isSpeaking
            ? "🔊 Speaking..."
            : showContinue
              ? "▶️ Continue"
              : "▶️ Listen"}
        </button>

        <button
          onClick={stop}
          disabled={!isSpeaking}
          className={`py-3 px-4 rounded-lg font-medium transition-colors ${
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
        className="w-full mb-4 py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        🧪 Test Speech
      </button>

      <div className="border rounded-lg p-3 space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Voice Settings</h4>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Voice</label>
          <select
            value={selectedVoice?.name || ""}
            onChange={(e) => {
              const voice = voices.find((v) => v.name === e.target.value);
              if (voice) {
                handleVoiceChange(voice);
              }
            }}
            className="w-full border rounded px-2 py-1 text-sm"
            disabled={voices.length === 0}
          >
            {voices.length === 0 && <option value="">No voices found</option>}
            {voices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {getLanguageFlag(voice.lang)} {voice.name} ({voice.lang}){" "}
                {voice.localService ? "✅" : "🌐"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">
            Speed: {speechRate}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.05"
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
            step="0.05"
            value={speechPitch}
            onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      <div className="text-xs text-gray-400 text-center mt-3 space-y-1">
        <span className="block text-green-600 font-medium">
          ✅ 100% Free - No API Keys!
        </span>
        <span className="block">
          🇬🇧 English | 🇩🇪 German | 🇪🇸 Spanish | 🇫🇷 French | 🇷🇺 Russian
        </span>
        <span className="block text-blue-500 text-xs">
          💡 2000 characters per chunk
        </span>
        <span className="block text-yellow-500 text-xs">
          ⏸️ Progress is saved automatically! Close and come back anytime.
        </span>
      </div>
    </div>
  );
};

export default AudioPlayer;
