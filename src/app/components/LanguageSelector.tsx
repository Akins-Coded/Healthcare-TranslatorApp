"use client";

type Props = {
  selectedLanguage: string;
  setLanguage: (lang: string) => void;
};

/** Language dropdown (typed for TS projects). */
export default function LanguageSelector({ selectedLanguage, setLanguage }: Props) {
  return (
    <select
      className="border p-2 rounded-md shadow-sm bg-white dark:bg-gray-800 dark:text-white"
      value={selectedLanguage}
      onChange={(e) => setLanguage(e.target.value)}
      aria-label="Select target language"
    >
      <option value="es">Spanish</option>
      <option value="en">English</option>
      <option value="fr">French</option>
      <option value="de">German</option>
      <option value="zh">Chinese</option>
      <option value="ar">Arabic</option>
      <option value="ru">Russian</option>
      <option value="hi">Hindi</option>
      <option value="ja">Japanese</option>
    </select>
  );
}
