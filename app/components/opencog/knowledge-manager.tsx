/**
 * Knowledge Base Manager Component
 * Provides UI for importing/exporting knowledge bases
 */

import React, { useState, useRef } from "react";
import { useOpenCogStore } from "../../store/opencog";
import {
  downloadKnowledgeBase,
  uploadKnowledgeBase,
} from "../../opencog/knowledge";
import styles from "./opencog.module.scss";

export function KnowledgeBaseManager() {
  const openCogStore = useOpenCogStore();
  const [importing, setImporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<
    "json" | "atomese" | "metta"
  >("json");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const atoms = openCogStore.atomSpace;

      if (atoms.length === 0) {
        setMessage("No atoms to export");
        return;
      }

      downloadKnowledgeBase(atoms, exportFormat);
      setMessage(`Exported ${atoms.length} atoms as ${exportFormat}`);

      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(
        `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage("Importing...");

    try {
      const { atoms, format } = await uploadKnowledgeBase(file);

      // Add atoms to atomspace
      atoms.forEach((atom) => openCogStore.addAtom(atom));

      setMessage(`Imported ${atoms.length} atoms from ${format} file`);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(
        `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClearAtomSpace = () => {
    if (
      confirm(
        `Are you sure you want to clear all ${openCogStore.atomSpace.length} atoms?`,
      )
    ) {
      openCogStore.clearAtomSpace();
      setMessage("AtomSpace cleared");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <div className={styles.knowledgeManager}>
      <h4>Knowledge Base Manager</h4>

      <div className={styles.atomSpaceStats}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Atoms:</span>
          <span className={styles.statValue}>
            {openCogStore.atomSpace.length}
          </span>
        </div>
      </div>

      <div className={styles.managerSection}>
        <h5>Export Knowledge Base</h5>
        <div className={styles.exportControls}>
          <select
            value={exportFormat}
            onChange={(e) =>
              setExportFormat(e.target.value as "json" | "atomese" | "metta")
            }
            className={styles.formatSelect}
          >
            <option value="json">JSON</option>
            <option value="atomese">Atomese (.scm)</option>
            <option value="metta">MeTTa (.metta)</option>
          </select>
          <button
            onClick={handleExport}
            disabled={openCogStore.atomSpace.length === 0}
            className={styles.exportButton}
          >
            Export
          </button>
        </div>
      </div>

      <div className={styles.managerSection}>
        <h5>Import Knowledge Base</h5>
        <div className={styles.importControls}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.scm,.metta"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          <button
            onClick={handleImportClick}
            disabled={importing}
            className={styles.importButton}
          >
            {importing ? "Importing..." : "Import File"}
          </button>
        </div>
      </div>

      <div className={styles.managerSection}>
        <h5>Manage AtomSpace</h5>
        <button
          onClick={handleClearAtomSpace}
          disabled={openCogStore.atomSpace.length === 0}
          className={styles.clearButton}
        >
          Clear AtomSpace
        </button>
      </div>

      {message && <div className={styles.managerMessage}>{message}</div>}
    </div>
  );
}
