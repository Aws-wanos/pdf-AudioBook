import React, { useState } from "react";

const TextSelector = ({ text, onTextSelect }) => {
  const [selectedRange, setSelectedRange] = useState({ start: 0, end: 0 });
  const [showSelector, setShowSelector] = useState(true);

  const handlePageRangeSelect = (startPage, endPage) => {
    const lines = text.split("\n");
    const startLine = (startPage - 1) * 40;
    const endLine = endPage * 40;
    const selected = lines.slice(startLine, endLine).join("\n");
    onTextSelect(selected);
  };

  const handleTextAreaSelect = (event) => {
    const start = event.target.selectionStart;
    const end = event.target.selectionEnd;
    if (start !== end) {
      const selected = text.substring(start, end);
      onTextSelect(selected);
    }
  };

  const selectAll = () => {
    onTextSelect(text);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="font-semibold text-gray-700 mb-3">📝 Select Text</h3>

      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          onClick={selectAll}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Select All
        </button>
        <button
          onClick={() => setShowSelector(!showSelector)}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
        >
          {showSelector ? "Hide" : "Show"} Page Selector
        </button>
      </div>

      {showSelector && (
        <div className="mb-3 p-3 bg-gray-50 rounded">
          <label className="text-sm font-medium">Select by Page Range:</label>
          <div className="flex gap-2 mt-1">
            <input
              type="number"
              min="1"
              placeholder="Start"
              className="border rounded px-2 py-1 w-20 text-sm"
              onChange={(e) =>
                setSelectedRange({
                  ...selectedRange,
                  start: parseInt(e.target.value) || 0,
                })
              }
            />
            <span className="self-center">to</span>
            <input
              type="number"
              min="1"
              placeholder="End"
              className="border rounded px-2 py-1 w-20 text-sm"
              onChange={(e) =>
                setSelectedRange({
                  ...selectedRange,
                  end: parseInt(e.target.value) || 0,
                })
              }
            />
            <button
              onClick={() =>
                handlePageRangeSelect(selectedRange.start, selectedRange.end)
              }
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              Select
            </button>
          </div>
        </div>
      )}

      <div className="border rounded-lg p-3 max-h-[300px] overflow-auto">
        <textarea
          value={text}
          readOnly
          onMouseUp={handleTextAreaSelect}
          className="w-full h-64 font-mono text-sm focus:outline-none resize-none"
          style={{ background: "transparent" }}
        />
        <p className="text-xs text-gray-400 mt-1">
          💡 Click and drag to select text, or use the page range selector above
        </p>
      </div>

      <div className="mt-2 text-sm text-gray-600">
        Selected: <span className="font-medium">{text.length} characters</span>
      </div>
    </div>
  );
};

export default TextSelector;
