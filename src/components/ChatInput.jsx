import React, { useState, useRef, useEffect } from "react";
import { FiSend, FiImage, FiMic, FiSquare, FiTrash2, FiLoader } from "react-icons/fi";
import toast from "react-hot-toast";

export default function ChatInput({ onSendMessage, disabled }) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaAttachment, setMediaAttachment] = useState(null); // { type: 'image' | 'audio', url: string, file: File, base64: string }
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      stopRecordingTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecordingTimer = () => {
    setRecordingTime(0);
    timerIntervalRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result;
          setMediaAttachment({
            type: "audio",
            url: URL.createObjectURL(audioBlob),
            base64: base64data,
          });
        };
        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      startRecordingTimer();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopRecordingTimer();
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setMediaAttachment({
        type: "image",
        url: URL.createObjectURL(file),
        base64: reader.result,
        file,
      });
    };
    e.target.value = ""; // Reset input
  };

  const clearAttachment = () => {
    if (mediaAttachment && mediaAttachment.url) {
      URL.revokeObjectURL(mediaAttachment.url);
    }
    setMediaAttachment(null);
  };

  const uploadMedia = async () => {
    if (!mediaAttachment) return null;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/upload/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          file: mediaAttachment.base64,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to upload media");
      }
      return data.url;
    } catch (error) {
      console.error("Media upload error:", error);
      toast.error("Failed to upload media");
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim() && !mediaAttachment) return;
    if (isUploading) return;

    setIsUploading(true);
    try {
      let attachmentUrl = null;
      if (mediaAttachment) {
        attachmentUrl = await uploadMedia();
        if (!attachmentUrl) return; // Stop if upload failed
      }

      await onSendMessage(message, attachmentUrl ? [attachmentUrl] : []);
      
      setMessage("");
      clearAttachment();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3 sticky bottom-0">
      {/* Attachment Preview Area */}
      {mediaAttachment && !isRecording && (
        <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-xl relative">
          <button
            onClick={clearAttachment}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-sm hover:bg-red-600 transition-colors z-10"
            disabled={isUploading || disabled}
          >
            <FiTrash2 className="w-4 h-4" />
          </button>

          {mediaAttachment.type === "image" ? (
            <div className="flex items-center gap-3">
              <img src={mediaAttachment.url} alt="Preview" className="h-20 w-auto rounded-lg object-cover" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Image attached</p>
                <p className="text-xs text-gray-500">{(mediaAttachment.file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-700">Voice Note</p>
              <audio src={mediaAttachment.url} controls className="w-full h-10" />
            </div>
          )}
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-sm font-medium text-orange-800">Recording audio... {formatTime(recordingTime)}</span>
          </div>
          <button
            onClick={handleStopRecording}
            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <FiSquare className="w-4 h-4 fill-current" />
            Stop
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {!isRecording && !mediaAttachment && (
          <>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageSelect}
              disabled={disabled || isUploading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              disabled={disabled || isUploading}
              title="Upload Image"
            >
              <FiImage className="w-5 h-5 text-gray-600" />
            </button>
            <button
              type="button"
              onMouseDown={handleStartRecording}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              disabled={disabled || isUploading}
              title="Record Voice Note"
            >
              <FiMic className="w-5 h-5 text-gray-600" />
            </button>
          </>
        )}

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isRecording ? "Recording..." : mediaAttachment?.type === 'audio' ? "Add a message (optional)" : "Type a message..."}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-orange-500 text-[15px] text-gray-900 placeholder:text-gray-500 disabled:bg-gray-50"
          disabled={disabled || isRecording || isUploading}
        />

        <button
          type="submit"
          disabled={disabled || isRecording || isUploading || (!message.trim() && !mediaAttachment)}
          className="p-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shrink-0 flex items-center justify-center w-9 h-9"
        >
          {isUploading ? <FiLoader className="w-5 h-5 animate-spin" /> : <FiSend className="w-5 h-5" />}
        </button>
      </form>
    </div>
  );
}
