"use client";

import { TextareaHTMLAttributes } from "react";

type Props = {
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  readOnly?: boolean;
  placeholder?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value">;

/** Reusable textarea with sensible defaults and a11y attributes. */
export default function TextArea({
  value,
  onChange,
  readOnly,
  placeholder,
  ...rest
}: Props) {
  return (
    <textarea
      className="border p-3 w-full max-w-xl my-4 h-28 rounded-md shadow-sm focus:ring focus:ring-blue-300 dark:bg-gray-800 dark:text-white"
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder={placeholder}
      aria-label={placeholder || "Text area"}
      {...rest}
    />
  );
}
