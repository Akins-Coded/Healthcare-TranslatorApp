"use client";

export default function TextArea({ value, onChange, readOnly, placeholder }) {
  return (
    <textarea
      className="border p-3 w-full max-w-lg my-4 h-24 rounded-md shadow-sm focus:ring focus:ring-blue-300"
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder={placeholder}
    />
  );
}
