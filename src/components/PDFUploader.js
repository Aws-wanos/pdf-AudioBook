import React, { useState, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import Tesseract from "tesseract.js";

// ====== PDF.js Worker ======
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PDFUploader = ({ onFileUpload, onTextExtracted }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isOcrMode, setIsOcrMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const fileInputRef = useRef(null);

  const extractTextFromPDF = async (file) => {
    setIsLoading(true);
    setError(null);
    setFileName(file.name);
    setProgress(0);
    setIsOcrMode(false);
    setCurrentPage(0);
    setTotalPages(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgress(10);

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      setTotalPages(totalPages);
      setProgress(15);

      let fullText = "";
      let ocrPages = 0;

      for (let i = 1; i <= totalPages; i++) {
        setCurrentPage(i);
        const page = await pdf.getPage(i);

        // ====== SKIP DIRECT TEXT - FORCE OCR ON ALL PAGES ======
        console.log(`🖼️ Page ${i}: Running OCR...`);
        setIsOcrMode(true);
        ocrPages++;

        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;
        const imageData = canvas.toDataURL("image/png");

        // ====== RUN OCR ======
        const result = await Tesseract.recognize(
          imageData,
          "eng+rus+deu+spa+fra",
          {
            logger: (m) => {
              if (m.status === "recognizing text") {
                const pageProgress = ((i - 1) / totalPages) * 100;
                setProgress(
                  Math.round(
                    15 + (pageProgress + (m.progress * 100) / totalPages) * 0.8,
                  ),
                );
              }
            },
          },
        );

        // ====== CLEAN THE OCR TEXT ======
        let pageText = result.data.text;
        // Remove excessive whitespace
        pageText = pageText.replace(/\s+/g, " ").trim();
        // Remove common OCR garbage
        pageText = pageText.replace(/[^a-zA-Z0-9\s.,!?;:()"'-]/g, "");

        if (pageText.length > 10) {
          fullText += `--- Page ${i} ---\n${pageText}\n\n`;
        }

        console.log(`✅ Page ${i}: OCR completed (${pageText.length} chars)`);
        setProgress(15 + (i / totalPages) * 80);
      }

      if (!fullText || fullText.trim().length < 20) {
        throw new Error("No text could be extracted from this PDF.");
      }

      setProgress(100);
      console.log(
        `✅ Extracted ${fullText.length} chars from ${ocrPages} pages`,
      );

      onTextExtracted(fullText);
      onFileUpload(file);
    } catch (err) {
      console.error("❌ Error:", err);
      setError("Failed to extract text: " + err.message);
    } finally {
      setIsLoading(false);
      setIsOcrMode(false);
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
              {isOcrMode
                ? `🔍 OCR Page ${currentPage}/${totalPages}`
                : `📄 Extracting page ${currentPage}/${totalPages}`}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          {isOcrMode && (
            <p className="text-xs text-yellow-500 mt-1">
              ⚠️ OCR mode: Processing scanned page {currentPage}
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
              {isOcrMode ? "Running OCR..." : "Extracting text..."}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Page {currentPage} of {totalPages}
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
            <p className="text-sm text-gray-400">🔍 OCR for scanned PDFs</p>
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
