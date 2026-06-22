import React, { useState, useRef } from "react";

const PDFUploader = ({ onFileUpload, onTextExtracted }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const fileInputRef = useRef(null);

  const extractTextFromPDF = (file) => {
    setIsLoading(true);
    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        // Clean the text and extract readable content
        const cleanText = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
        const matches = cleanText.match(/\(([^)]*)\)/g);
        let extractedText = matches
          ? matches.map((m) => m.slice(1, -1)).join(" ")
          : "";

        if (!extractedText || extractedText.length < 20) {
          const readable = cleanText.match(/[A-Za-z]{4,}/g);
          if (readable) extractedText = readable.join(" ");
        }

        if (extractedText && extractedText.length > 20) {
          onTextExtracted(extractedText);
          onFileUpload(file);
        } else {
          setError(
            "Could not extract text. For scanned PDFs, use the OCR Converter first.",
          );
        }
      } catch (err) {
        setError("Failed to extract text: " + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setError("Failed to read file");
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      extractTextFromPDF(file);
    } else {
      setError("Please upload a PDF file");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      extractTextFromPDF(file);
    } else {
      setError("Please upload a PDF file");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="font-semibold text-gray-700 mb-3">📄 Upload PDF</h3>

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

      {isLoading && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Extracting text...</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full animate-pulse"></div>
          </div>
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isLoading
            ? "bg-gray-100 border-gray-400"
            : "border-gray-300 hover:border-blue-500"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {isLoading ? (
          <div className="py-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-500">Extracting text...</p>
          </div>
        ) : (
          <>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-gray-600">
              Drag & drop your PDF here, or click to browse
            </p>
            <p className="text-sm text-gray-400">
              For scanned PDFs, use the OCR Converter
            </p>
          </>
        )}
      </div>

      {fileName && !isLoading && (
        <div className="mt-2 text-sm text-green-600">✅ {fileName}</div>
      )}
    </div>
  );
};

export default PDFUploader;
