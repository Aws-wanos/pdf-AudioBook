// src/components/FileUploader.jsx (Updated)
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";

const FileUploader = ({ onFileUpload, onTextExtracted }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const extractText = useCallback(
    async (file) => {
      try {
        setLoading(true);
        setError(null);
        setProgress(10);

        const fileType = file.name.split(".").pop().toLowerCase();
        let text = "";

        // Handle different file types
        if (fileType === "txt") {
          // TXT files
          const content = await file.text();
          text = content;
          setProgress(100);
        } else if (fileType === "pdf") {
          // PDF files
          const arrayBuffer = await file.arrayBuffer();
          setProgress(40);
          const data = await pdfParse(arrayBuffer);
          text = data.text;
          setProgress(100);
        } else if (fileType === "docx") {
          // DOCX files
          const arrayBuffer = await file.arrayBuffer();
          setProgress(40);
          const result = await mammoth.extractRawText({ arrayBuffer });
          text = result.value;
          setProgress(100);
        } else if (fileType === "doc") {
          // DOC files - less reliable but try
          const content = await file.text();
          text = content;
          setProgress(100);
        } else if (fileType === "epub" || fileType === "mobi") {
          // For these, use a simple read
          const content = await file.text();
          text = content;
          setProgress(100);
        } else {
          throw new Error(`Unsupported file type: ${fileType}`);
        }

        // Clean up the text
        text = text.replace(/\s+/g, " ").trim();

        if (!text || text.length < 10) {
          throw new Error("No text could be extracted from this file");
        }

        // Success!
        if (onFileUpload) onFileUpload(file);
        if (onTextExtracted) onTextExtracted(text);

        setLoading(false);
        return text;
      } catch (err) {
        console.error("Extraction error:", err);
        setError(`Could not extract text: ${err.message}`);
        setLoading(false);
        setProgress(0);
        if (onTextExtracted) onTextExtracted("");
      }
    },
    [onFileUpload, onTextExtracted],
  );

  const onDrop = useCallback(
    async (acceptedFiles) => {
      const uploadedFile = acceptedFiles[0];
      if (!uploadedFile) return;

      setFile(uploadedFile);
      setError(null);
      await extractText(uploadedFile);
    },
    [extractText],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/msword": [".doc"],
      "application/epub+zip": [".epub"],
    },
    maxFiles: 1,
    disabled: loading,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        📄 Upload Your File
      </h2>

      <div
        {...getRootProps()}
        className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-all duration-200
                    ${loading ? "opacity-50 cursor-default" : "hover:bg-gray-50"}
                    ${error ? "border-red-400 bg-red-50" : ""}
                    ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}
                `}
      >
        <input {...getInputProps()} />

        {loading ? (
          <div>
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-gray-600 font-medium">Extracting text...</p>
            <div className="w-full max-w-xs mx-auto mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {Math.round(progress)}%
            </p>
          </div>
        ) : error ? (
          <div>
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-red-600 font-medium mb-2">{error}</p>
            <p className="text-sm text-gray-500">Click or drag to try again</p>
          </div>
        ) : (
          <div>
            <div className="text-5xl mb-3">📄</div>
            <p className="text-gray-600 font-medium">
              {isDragActive
                ? "Drop your file here"
                : "Drag & drop your file here"}
            </p>
            <p className="text-sm text-gray-400 mt-1">or click to browse</p>
            <div className="mt-3 text-sm text-gray-500">
              <span className="inline-block bg-gray-100 px-2 py-1 rounded mr-1">
                PDF
              </span>
              <span className="inline-block bg-gray-100 px-2 py-1 rounded mr-1">
                TXT
              </span>
              <span className="inline-block bg-gray-100 px-2 py-1 rounded mr-1">
                DOCX
              </span>
              <span className="inline-block bg-gray-100 px-2 py-1 rounded">
                EPUB
              </span>
            </div>
            {file && !error && (
              <div className="mt-3 text-green-600">
                <p className="font-medium">✓ {file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
