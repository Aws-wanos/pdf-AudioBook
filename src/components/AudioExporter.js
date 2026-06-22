import React, { useState, useCallback, useEffect } from "react";
import { generateAudio, splitText, initTTS } from "../services/realTTS";

const AudioExporter = ({ text }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize TTS - FIXED: removed selectedVoice dependency
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        await initTTS();
        setIsReady(true);
        setIsLoading(false);
        console.log("✅ TTS ready");
      } catch (err) {
        console.error("TTS init error:", err);
        setError("Failed to load TTS engine: " + err.message);
        setIsLoading(false);
      }
    };
    initialize();
  }, []); // Empty dependency array - only runs once

  const cleanText = (text) => {
    if (!text) return "";
    return text
      .replace(/\s+/g, " ")
      .replace(/[^\w\s.,!?;:()"'-]/g, " ")
      .replace(/(\w)-\s+(\w)/g, "$1$2")
      .replace(/’/g, "'")
      .replace(/“/g, '"')
      .replace(/”/g, '"')
      .replace(/…/g, "...")
      .replace(/—/g, "-")
      .replace(/–/g, "-")
      .replace(/https?:\/\/[^\s]+/g, "")
      .replace(/www\.[^\s]+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  const exportAudio = useCallback(async () => {
    if (!text || text.length === 0) {
      setError("No text to export.");
      return;
    }

    if (!isReady) {
      setError("TTS engine is not ready.");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setError(null);

    try {
      const cleanedText = cleanText(text);
      if (cleanedText.length === 0) {
        throw new Error("No readable text found");
      }

      const chunks = splitText(cleanedText, 500);
      console.log(`📢 Processing ${chunks.length} chunks`);

      let audioChunks = [];
      let successCount = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`Processing chunk ${i + 1}/${chunks.length}`);

        setExportProgress((i / chunks.length) * 100);

        try {
          const blob = await generateAudio(chunk, {
            speed: 175,
            pitch: 50,
          });

          if (blob && blob.size > 0) {
            audioChunks.push(blob);
            successCount++;
            console.log(`✅ Chunk ${i + 1}: ${blob.size} bytes`);
          }
        } catch (chunkError) {
          console.warn(`⚠️ Chunk ${i + 1} failed:`, chunkError.message);
        }

        setExportProgress(((i + 1) / chunks.length) * 100);
      }

      if (audioChunks.length === 0) {
        throw new Error("No audio generated");
      }

      let finalBlob;
      if (audioChunks.length === 1) {
        finalBlob = audioChunks[0];
      } else {
        const chunksArray = await Promise.all(
          audioChunks.map(async (blob) => {
            const buffer = await blob.arrayBuffer();
            return new Uint8Array(buffer);
          }),
        );

        const totalLength = chunksArray.reduce(
          (acc, arr) => acc + arr.length,
          0,
        );
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const arr of chunksArray) {
          combined.set(arr, offset);
          offset += arr.length;
        }
        finalBlob = new Blob([combined], { type: "audio/wav" });
      }

      const url = URL.createObjectURL(finalBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audiobook_${new Date().toISOString().slice(0, 10)}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 5000);

      alert(`✅ Audio exported! (${successCount}/${chunks.length} chunks)`);
    } catch (error) {
      setError("Export failed: " + error.message);
    } finally {
      setIsExporting(false);
    }
  }, [text, isReady]);

  const textPreview =
    text && text.length > 100 ? text.substring(0, 100) + "..." : text;

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="font-semibold text-gray-700 mb-3">🎧 Audio Export</h3>

      <div
        className={`mb-4 px-4 py-2 rounded ${
          isReady
            ? "bg-green-50 border border-green-300 text-green-700"
            : isLoading
              ? "bg-yellow-50 border border-yellow-300 text-yellow-700"
              : "bg-red-50 border border-red-300 text-red-700"
        }`}
      >
        <span className="text-sm">
          {isLoading
            ? "⏳ Loading TTS engine..."
            : isReady
              ? "✅ TTS ready"
              : "❌ TTS failed"}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-4">
        {text && (
          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
            <strong>Text:</strong> {textPreview}
            <div className="text-xs text-gray-400 mt-1">
              {text.length} characters (~{Math.round(text.length / 5)} words)
            </div>
          </div>
        )}

        {isExporting && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>⏳ Generating...</span>
              <span>{Math.round(exportProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="border rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Voice Settings
          </h4>

          <div className="mb-2">
            <label className="text-sm text-gray-600 block mb-1">Speed</label>
            <input
              type="range"
              min="80"
              max="250"
              step="5"
              defaultValue={175}
              disabled={!isReady || isExporting}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">Pitch</label>
            <input
              type="range"
              min="20"
              max="80"
              step="5"
              defaultValue={50}
              disabled={!isReady || isExporting}
              className="w-full"
            />
          </div>
        </div>

        <button
          onClick={exportAudio}
          disabled={!text || isExporting || !isReady || isLoading}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            text && !isExporting && isReady && !isLoading
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-gray-300 cursor-not-allowed text-gray-500"
          }`}
        >
          {isLoading
            ? "⏳ Loading..."
            : isExporting
              ? "⏳ Generating..."
              : !isReady
                ? "⏳ Waiting..."
                : "⬇️ Download Audio (WAV)"}
        </button>

        <div className="text-xs text-gray-400 text-center border-t pt-3">
          <span className="block text-green-600 font-medium">
            ✅ 100% Free - NO Microphone, NO Recording!
          </span>
          <span className="block mt-1 text-gray-400">
            Uses espeak-wasm - Pure text-to-speech
          </span>
          <span className="block mt-1 text-gray-400">
            📦 Output: WAV (high quality)
          </span>
        </div>
      </div>
    </div>
  );
};

export default AudioExporter;
