/**
 * Translation Panel Component
 * Natural language to/from Atomese/MeTTa translation
 */

"use client";

import React, { useState } from "react";
import { useOpenCogStore } from "../../store/opencog";
import { Format } from "../../opencog/types";
import styles from "./opencog.module.scss";

export function TranslationPanel() {
  const openCogStore = useOpenCogStore();
  const { showTranslationPanel, initialized } = openCogStore;

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [sourceFormat, setSourceFormat] = useState<Format>(
    Format.NATURAL_LANGUAGE,
  );
  const [targetFormat, setTargetFormat] = useState<Format>(Format.ATOMESE);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState("");

  if (!showTranslationPanel) {
    return null;
  }

  const handleTranslate = async () => {
    if (!input.trim()) {
      setError("Please enter text to translate");
      return;
    }

    setIsTranslating(true);
    setError("");

    try {
      const result = await openCogStore.translate({
        input,
        sourceFormat,
        targetFormat,
      });
      setOutput(result.output);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setIsTranslating(false);
    }
  };

  const swapFormats = () => {
    const temp = sourceFormat;
    setSourceFormat(targetFormat);
    setTargetFormat(temp);
    setInput(output);
    setOutput("");
  };

  const formatOptions = [
    { value: Format.NATURAL_LANGUAGE, label: "Natural Language" },
    { value: Format.ATOMESE, label: "Atomese" },
    { value: Format.METTA, label: "MeTTa" },
    { value: Format.SCHEME, label: "Scheme" },
  ];

  return (
    <div className={styles["translation-panel"]}>
      <div className={styles["panel-header"]}>
        <h3>Language Translator</h3>
        <button
          className={styles["close-button"]}
          onClick={() => openCogStore.setShowTranslationPanel(false)}
        >
          ✕
        </button>
      </div>

      <div className={styles["translation-content"]}>
        <div className={styles["format-selector"]}>
          <div className={styles["format-group"]}>
            <label>Source Format:</label>
            <select
              value={sourceFormat}
              onChange={(e) => setSourceFormat(e.target.value as Format)}
            >
              {formatOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            className={styles["swap-button"]}
            onClick={swapFormats}
            title="Swap formats"
          >
            ⇄
          </button>

          <div className={styles["format-group"]}>
            <label>Target Format:</label>
            <select
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value as Format)}
            >
              {formatOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles["translation-area"]}>
          <div className={styles["input-section"]}>
            <label>Input:</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Enter ${formatOptions.find((f) => f.value === sourceFormat)?.label}...`}
              rows={10}
            />
          </div>

          <div className={styles["output-section"]}>
            <label>Output:</label>
            <textarea
              value={output}
              readOnly
              placeholder="Translation will appear here..."
              rows={10}
            />
          </div>
        </div>

        {error && <div className={styles["error-message"]}>{error}</div>}

        <div className={styles["translation-actions"]}>
          <button
            onClick={handleTranslate}
            disabled={isTranslating || !initialized}
            className={styles["translate-button"]}
          >
            {isTranslating ? "Translating..." : "Translate"}
          </button>
          <button
            onClick={() => {
              setInput("");
              setOutput("");
              setError("");
            }}
            className={styles["clear-button"]}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
