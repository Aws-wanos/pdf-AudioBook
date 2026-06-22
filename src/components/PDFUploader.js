import React, { useState, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import Tesseract from "tesseract.js";

// ====== FIX: Use CDN worker ======
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const PDFUploader = ({ onFileUpload, onTextExtracted }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [progress, setProgress] = useState(0);
  const [ocrMode, setOcrMode] = useState(false);
  const fileInputRef = useRef(null);

  // Extract text from a single page (direct or OCR)
  const extractPageText = async (page, pageNum, totalPages) => {
    try {
      // Try to get text directly first
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");

      // If there's substantial text, use it directly
      if (pageText.trim().length > 50) {
        console.log(
          `📄 Page ${pageNum}: Direct text extraction (${pageText.length} chars)`,
        );
        return pageText;
      }

      // If no text, use OCR (image-based)
      console.log(`🖼️ Page ${pageNum}: No text found, running OCR...`);
      setOcrMode(true);

      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;

      const imageData = canvas.toDataURL("image/png");

      // Run OCR with Tesseract
      const result = await Tesseract.recognize(
        imageData,
        "eng+rus+deu+spa+fra",
        {
          logger: (m) => {
            if (m.status === "recognizing text") {
              const pageProgress = ((pageNum - 1) / totalPages) * 100;
              const chunkProgress = (m.progress * 100) / totalPages;
              setProgress(Math.round(pageProgress + chunkProgress));
            }
          },
        },
      );

      console.log(
        `✅ Page ${pageNum}: OCR completed (${result.data.text.length} chars)`,
      );
      return result.data.text;
    } catch (err) {
      console.warn(`⚠️ Page ${pageNum} failed:`, err.message);
      return ""; // Return empty string if page fails
    }
  };

  const extractTextFromPDF = async (file) => {
    setIsLoading(true);
    setError(null);
    setFileName(file.name);
    setProgress(10);
    setOcrMode(false);

    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgress(20);

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      setProgress(30);

      let fullText = "";

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const pageText = await extractPageText(page, i, totalPages);
        fullText += pageText + "\n\n";
        setProgress(30 + (i / totalPages) * 60);
      }

      if (!fullText || fullText.trim().length < 20) {
        throw new Error(
          "No text could be extracted from the PDF. The file may be corrupted or empty.",
        );
      }

      setProgress(100);
      console.log(
        `✅ Text extracted: ${fullText.length} characters (${totalPages} pages)`,
      );

      onTextExtracted(fullText);
      onFileUpload(file);
    } catch (err) {
      console.error("❌ Error extracting text:", err);
      setError("Failed to extract text: " + err.message);
    } finally {
      setIsLoading(false);
      setProgress(100);
      setOcrMode(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    ) {
      extractTextFromPDF(file);
    } else {
      setError("Please upload a valid PDF file");
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;

    if (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    ) {
      extractTextFromPDF(file);
    } else {
      setError("Please upload a valid PDF file");
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
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
            <span>
              {ocrMode ? "🔍 Running OCR..." : "📄 Extracting text..."}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          {ocrMode && (
            <p className="text-xs text-yellow-500 mt-1">
              ⚠️ OCR mode active - processing image pages (slower)
            </p>
          )}
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
            <p className="mt-2 text-gray-500">
              {ocrMode ? "Running OCR..." : "Extracting text..."}
            </p>
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
              Supports text PDFs + scanned PDFs (OCR)
            </p>
          </>
        )}
      </div>

      {fileName && !isLoading && (
        <div className="mt-2 text-sm text-green-600">
          ✅ File processed: {fileName}
        </div>
      )}
    </div>
  );
};

export default PDFUploader;
