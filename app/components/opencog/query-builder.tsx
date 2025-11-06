/**
 * Query Builder Component
 * Visual interface for building and executing AtomSpace queries
 */

import React, { useState } from "react";
import { useOpenCogStore } from "../../store/opencog";
import {
  AtomQueryBuilder,
  QueryCriteria,
  QueryResult,
} from "../../opencog/knowledge";
import { AtomType } from "../../opencog/types";
import styles from "./opencog.module.scss";

export function QueryBuilderPanel() {
  const openCogStore = useOpenCogStore();
  const [criteria, setCriteria] = useState<QueryCriteria[]>([]);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [combineMode, setCombineMode] = useState<"AND" | "OR">("AND");
  const [limit, setLimit] = useState<number>(50);
  const [executing, setExecuting] = useState(false);

  const addCriterion = () => {
    setCriteria([...criteria, {}]);
  };

  const updateCriterion = (index: number, updates: Partial<QueryCriteria>) => {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], ...updates };
    setCriteria(newCriteria);
  };

  const removeCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const executeQuery = () => {
    setExecuting(true);

    try {
      const builder = new AtomQueryBuilder();

      criteria.forEach((c) => builder.where(c));
      builder.combine(combineMode);
      builder.setLimit(limit);
      builder.orderBy("relevance", "desc");

      const queryResults = builder.execute(openCogStore.atomSpace);
      setResults(queryResults);
    } catch (error) {
      console.error("Query execution failed:", error);
    } finally {
      setExecuting(false);
    }
  };

  const clearQuery = () => {
    setCriteria([]);
    setResults([]);
  };

  return (
    <div className={styles.queryBuilder}>
      <h4>AtomSpace Query Builder</h4>

      <div className={styles.queryControls}>
        <div className={styles.controlGroup}>
          <label>Combine Mode:</label>
          <select
            value={combineMode}
            onChange={(e) => setCombineMode(e.target.value as "AND" | "OR")}
          >
            <option value="AND">AND (all criteria)</option>
            <option value="OR">OR (any criterion)</option>
          </select>
        </div>

        <div className={styles.controlGroup}>
          <label>Limit Results:</label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            min={1}
            max={1000}
          />
        </div>
      </div>

      <div className={styles.criteriaList}>
        <div className={styles.criteriaHeader}>
          <h5>Query Criteria</h5>
          <button onClick={addCriterion} className={styles.addButton}>
            + Add Criterion
          </button>
        </div>

        {criteria.length === 0 && (
          <div className={styles.noCriteria}>
            No criteria defined. Click &quot;+ Add Criterion&quot; to start
            building your query.
          </div>
        )}

        {criteria.map((criterion, index) => (
          <div key={index} className={styles.criterionCard}>
            <div className={styles.criterionHeader}>
              <span>Criterion {index + 1}</span>
              <button
                onClick={() => removeCriterion(index)}
                className={styles.removeButton}
              >
                ×
              </button>
            </div>

            <div className={styles.criterionFields}>
              <div className={styles.field}>
                <label>Atom Type:</label>
                <select
                  value={criterion.type || ""}
                  onChange={(e) =>
                    updateCriterion(index, {
                      type: e.target.value as AtomType,
                    })
                  }
                >
                  <option value="">Any</option>
                  <option value="ConceptNode">ConceptNode</option>
                  <option value="PredicateNode">PredicateNode</option>
                  <option value="VariableNode">VariableNode</option>
                  <option value="InheritanceLink">InheritanceLink</option>
                  <option value="SimilarityLink">SimilarityLink</option>
                  <option value="EvaluationLink">EvaluationLink</option>
                  <option value="ImplicationLink">ImplicationLink</option>
                </select>
              </div>

              <div className={styles.field}>
                <label>Name:</label>
                <input
                  type="text"
                  value={
                    typeof criterion.name === "string" ? criterion.name : ""
                  }
                  onChange={(e) =>
                    updateCriterion(index, { name: e.target.value })
                  }
                  placeholder="Exact name match"
                />
              </div>

              <div className={styles.field}>
                <label>Min Truth Strength:</label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={criterion.minTruthStrength ?? ""}
                  onChange={(e) =>
                    updateCriterion(index, {
                      minTruthStrength: parseFloat(e.target.value),
                    })
                  }
                  placeholder="0.0 - 1.0"
                />
              </div>

              <div className={styles.field}>
                <label>Min Truth Confidence:</label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={criterion.minTruthConfidence ?? ""}
                  onChange={(e) =>
                    updateCriterion(index, {
                      minTruthConfidence: parseFloat(e.target.value),
                    })
                  }
                  placeholder="0.0 - 1.0"
                />
              </div>

              <div className={styles.field}>
                <label>Has Children:</label>
                <select
                  value={
                    criterion.hasChildren === undefined
                      ? ""
                      : criterion.hasChildren
                        ? "true"
                        : "false"
                  }
                  onChange={(e) =>
                    updateCriterion(index, {
                      hasChildren:
                        e.target.value === ""
                          ? undefined
                          : e.target.value === "true",
                    })
                  }
                >
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.queryActions}>
        <button
          onClick={executeQuery}
          disabled={criteria.length === 0 || executing}
          className={styles.executeButton}
        >
          {executing ? "Executing..." : "Execute Query"}
        </button>
        <button onClick={clearQuery} className={styles.clearButton}>
          Clear
        </button>
      </div>

      {results.length > 0 && (
        <div className={styles.queryResults}>
          <h5>Results ({results.length})</h5>
          <div className={styles.resultsList}>
            {results.map((result, index) => (
              <div key={index} className={styles.resultCard}>
                <div className={styles.resultHeader}>
                  <span className={styles.resultType}>{result.atom.type}</span>
                  <span className={styles.resultScore}>
                    Score: {(result.score * 100).toFixed(0)}%
                  </span>
                </div>
                {result.atom.name && (
                  <div className={styles.resultName}>{result.atom.name}</div>
                )}
                {result.atom.truthValue && (
                  <div className={styles.resultTruth}>
                    TV: ({result.atom.truthValue.strength.toFixed(3)},{" "}
                    {result.atom.truthValue.confidence.toFixed(3)})
                  </div>
                )}
                {result.atom.children && (
                  <div className={styles.resultChildren}>
                    {result.atom.children.length} children
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
