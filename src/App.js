import React, { useState, useCallback } from "react";
import PDFUploader from "./components/PDFUploader";
import PageRangeSelector from "./components/PageRangeSelector";
import AudioPlayer from "./components/AudioPlayer";
import LanguageTeacher from "./components/LanguageTeacher";

function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [totalPages, setTotalPages] = useState(0);
  const [pageTexts, setPageTexts] = useState({});
  const [activeTab, setActiveTab] = useState("home");

  const handleFileUpload = useCallback((file) => {
    setPdfFile(file);
  }, []);

  const handleTextExtracted = useCallback((text) => {
    setExtractedText(text);
    const estimatedPages = Math.ceil(text.length / 2000);
    setTotalPages(estimatedPages);
    const pageTextsMap = {};
    const lines = text.split("\n");
    const linesPerPage = Math.ceil(lines.length / estimatedPages);
    for (let i = 0; i < estimatedPages; i++) {
      const start = i * linesPerPage;
      const end = Math.min((i + 1) * linesPerPage, lines.length);
      pageTextsMap[i + 1] = lines.slice(start, end).join("\n");
    }
    setPageTexts(pageTextsMap);
    console.log(`📄 Extracted ${text.length} chars, ~${estimatedPages} pages`);
  }, []);

  const handleRangeSelect = useCallback((text, startPage, endPage) => {
    setSelectedText(text);
    console.log(
      `Selected pages ${startPage}-${endPage}, ${text.length} characters`,
    );
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold">📚 PDF Audiobook Converter</h1>
          <p className="text-sm opacity-90">
            Upload a PDF, then listen or learn
          </p>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-6xl">
        {/* ====== INFO NOTE ====== */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="text-sm font-medium text-gray-800">
                Want to learn a language?
                <span className="text-purple-600 font-bold">
                  {" "}
                  Upload a language book
                </span>{" "}
                and click
                <span className="text-purple-600 font-bold">
                  {" "}
                  "Language Teacher"
                </span>
                !
              </p>
              <p className="text-xs text-gray-500 mt-1">
                The AI will create structured lessons, vocabulary lists, grammar
                explanations, and quizzes from your book. Process 5,000
                characters at a time (one chunk per minute due to API limits).
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN - Upload */}
          <div className="space-y-4">
            <PDFUploader
              onFileUpload={handleFileUpload}
              onTextExtracted={handleTextExtracted}
            />

            {extractedText && (
              <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-2 rounded text-sm">
                ✅ Book loaded: {extractedText.length.toLocaleString()}{" "}
                characters, ~{totalPages} pages
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Features */}
          <div className="space-y-4">
            {extractedText ? (
              <>
                {/* Main Page Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setActiveTab("listen")}
                    className={`p-6 rounded-lg border-2 text-center transition-all ${
                      activeTab === "listen"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <span className="text-4xl block mb-2">🎧</span>
                    <span className="font-semibold text-gray-700">
                      Listen to Book
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Convert text to speech
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveTab("teacher")}
                    className={`p-6 rounded-lg border-2 text-center transition-all ${
                      activeTab === "teacher"
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                    }`}
                  >
                    <span className="text-4xl block mb-2">📚</span>
                    <span className="font-semibold text-gray-700">
                      Language Teacher
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      AI-powered lessons & quizzes
                    </p>
                  </button>
                </div>

                {/* Feature Content */}
                {activeTab === "listen" && (
                  <>
                    <PageRangeSelector
                      totalPages={totalPages}
                      extractedText={extractedText}
                      pageTexts={pageTexts}
                      onRangeSelect={handleRangeSelect}
                    />
                    {selectedText && <AudioPlayer text={selectedText} />}
                  </>
                )}

                {activeTab === "teacher" && (
                  <LanguageTeacher text={extractedText} />
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-400 text-lg">
                  📖 Upload a book to get started
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Then choose Listen or Language Teacher
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
