import React, { useState } from "react";
import { uploadPDF, checkStatus } from "../services/api";

const PDFUploader = ({ onTextExtracted, onAudioReady }) => {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState("");

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type === "application/pdf") {
      setFile(selected);
      setError(null);
    } else {
      setError("Please upload a valid PDF file");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a PDF file");
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await uploadPDF(formData);
      setTaskId(response.data.task_id);
      setStatus("processing");

      // Poll for status
      pollStatus(response.data.task_id);
    } catch (err) {
      setError("Failed to upload PDF: " + err.message);
      setIsLoading(false);
    }
  };

  const pollStatus = async (id) => {
    const interval = setInterval(async () => {
      try {
        const response = await checkStatus(id);
        setStatus(response.data.status);

        if (response.data.status === "completed") {
          clearInterval(interval);
          setIsLoading(false);
          if (onAudioReady) onAudioReady(id);
        } else if (response.data.status === "failed") {
          clearInterval(interval);
          setIsLoading(false);
          setError("Processing failed. Please try again.");
        }
      } catch (err) {
        clearInterval(interval);
        setIsLoading(false);
        setError("Failed to check status");
      }
    }, 3000);
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

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isLoading
            ? "bg-gray-100 border-gray-400"
            : "border-gray-300 hover:border-blue-500"
        }`}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = e.dataTransfer.files[0];
          if (dropped) {
            const event = { target: { files: [dropped] } };
            handleFileChange(event);
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById("fileInput").click()}
      >
        <input
          id="fileInput"
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {isLoading ? (
          <div className="py-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-500">Processing... {status}</p>
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
              {file
                ? `📄 ${file.name}`
                : "Drag & drop your PDF here, or click to browse"}
            </p>
            <p className="text-sm text-gray-400">Supports scanned PDFs (OCR)</p>
          </>
        )}
      </div>

      {file && !isLoading && (
        <button
          onClick={handleUpload}
          className="mt-4 w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          📤 Upload and Process PDF
        </button>
      )}
    </div>
  );
};

export default PDFUploader;
