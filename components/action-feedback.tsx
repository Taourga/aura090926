"use client";

export function ActionFeedback({ message, error }: { message?: string; error?: string }) {
  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (message) return <p className="form-success" role="status">{message}</p>;
  return null;
}
