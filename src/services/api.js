import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

export const getVoices = () => {
  return axios.get(`${API_BASE}/voices`);
};

export const uploadPDF = (formData) => {
  return axios.post(`${API_BASE}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const checkStatus = (taskId) => {
  return axios.get(`${API_BASE}/status/${taskId}`);
};

export const downloadAudio = (taskId) => {
  return axios.get(`${API_BASE}/download/${taskId}`, {
    responseType: "blob",
  });
};
