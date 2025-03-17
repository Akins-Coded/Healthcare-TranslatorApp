"use client";

export default function LanguageSelector({ selectedLanguage, setLanguage }) {
  return (
    <select
      className="border p-2 rounded-md shadow-sm bg-white dark:bg-gray-800 dark:text-white"
      value={selectedLanguage}
      onChange={(e) => setLanguage(e.target.value)}
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

