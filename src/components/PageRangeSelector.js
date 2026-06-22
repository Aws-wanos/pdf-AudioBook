import React, { useState, useEffect } from "react";

const PageRangeSelector = ({
  totalPages,
  extractedText,
  pageTexts,
  onRangeSelect,
}) => {
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(totalPages || 1);
  const [selectedText, setSelectedText] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    setEndPage(totalPages || 1);
  }, [totalPages]);

  const handleRangeSelect = () => {
    if (!extractedText) {
      alert("Please extract text from PDF first");
      return;
    }

    if (startPage < 1 || startPage > totalPages) {
      setError(`Start page must be between 1 and ${totalPages}`);
      return;
    }
    if (endPage < 1 || endPage > totalPages) {
      setError(`End page must be between 1 and ${totalPages}`);
      return;
    }
    if (startPage > endPage) {
      setError("Start page must be less than or equal to end page");
      return;
    }

    setError("");
    let selected = "";

    if (pageTexts && Object.keys(pageTexts).length > 0) {
      for (let i = startPage; i <= endPage; i++) {
        if (pageTexts[i]) {
          selected += pageTexts[i] + "\n\n";
        }
      }
    } else {
      const lines = extractedText.split("\n");
      const totalLines = lines.length;
      const linesPerPage = Math.ceil(totalLines / totalPages);
      const startIndex = (startPage - 1) * linesPerPage;
      const endIndex = Math.min(endPage * linesPerPage, totalLines);
      selected = lines.slice(startIndex, endIndex).join("\n");
    }

    if (selected.trim().length === 0) {
      alert(
        `No text found in pages ${startPage}-${endPage}. Try a different range.`,
      );
      return;
    }

    const charCount = selected.length;
    setCharCount(charCount);
    setWordCount(Math.round(charCount / 5));

    setSelectedText(selected);
    onRangeSelect(selected, startPage, endPage);
    console.log(
      `✅ Selected pages ${startPage}-${endPage}: ${charCount} characters`,
    );
  };

  const handleStartPageChange = (e) => {
    const value = parseInt(e.target.value);
    if (isNaN(value) || value < 1) {
      setStartPage(1);
    } else if (value > totalPages) {
      setStartPage(totalPages);
    } else {
      setStartPage(value);
    }
    setError("");
  };

  const handleEndPageChange = (e) => {
    const value = parseInt(e.target.value);
    if (isNaN(value) || value < 1) {
      setEndPage(1);
    } else if (value > totalPages) {
      setEndPage(totalPages);
    } else {
      setEndPage(value);
    }
    setError("");
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="font-semibold text-gray-700 mb-3">📄 Select Page Range</h3>

      <div className="space-y-4">
        <div className="flex gap-4 items-start">
          <div className="flex-1">
            <label className="text-sm text-gray-600 block mb-1">
              Start Page
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setStartPage(Math.max(1, startPage - 1))}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-l-lg border border-gray-300 text-sm font-bold"
                disabled={startPage <= 1}
              >
                ▼
              </button>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={startPage}
                onChange={handleStartPageChange}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() =>
                  setStartPage(Math.min(totalPages, startPage + 1))
                }
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-r-lg border border-gray-300 text-sm font-bold"
                disabled={startPage >= totalPages}
              >
                ▲
              </button>
            </div>
          </div>

          <div className="flex-1">
            <label className="text-sm text-gray-600 block mb-1">End Page</label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEndPage(Math.max(startPage, endPage - 1))}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-l-lg border border-gray-300 text-sm font-bold"
                disabled={endPage <= startPage}
              >
                ▼
              </button>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={endPage}
                onChange={handleEndPageChange}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => setEndPage(Math.min(totalPages, endPage + 1))}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-r-lg border border-gray-300 text-sm font-bold"
                disabled={endPage >= totalPages}
              >
                ▲
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            ⚠️ {error}
          </div>
        )}

        <div className="text-sm text-gray-500 text-center">
          Pages: <span className="font-medium">{startPage}</span> -{" "}
          <span className="font-medium">{endPage}</span> (of {totalPages} pages)
        </div>

        {charCount > 0 && (
          <div className="text-sm p-2 rounded text-center bg-blue-50 border border-blue-300 text-blue-700">
            📄 {charCount.toLocaleString()} characters (~
            {wordCount.toLocaleString()} words)
            <div className="text-xs text-gray-500 mt-1">
              Estimated speech time: ~{Math.round(charCount / 1500)} minutes
            </div>
          </div>
        )}

        <button
          onClick={handleRangeSelect}
          className="w-full py-2 px-4 rounded-lg text-white bg-blue-500 hover:bg-blue-600 transition-colors"
        >
          Select Range
        </button>

        {selectedText && (
          <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
            ✅ Selected {selectedText.length.toLocaleString()} characters from
            pages {startPage}-{endPage}
            <div className="text-xs text-gray-400 mt-1">
              ~{Math.round(selectedText.length / 5).toLocaleString()} words
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageRangeSelector;
