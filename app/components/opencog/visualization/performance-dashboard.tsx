/**
 * Performance Monitoring Dashboard
 * Real-time monitoring of agent performance and system metrics
 */

import React, { useEffect, useState } from "react";
import styles from "../opencog.module.scss";

interface PerformanceMetrics {
  reasoning: {
    plnInferences: number;
    averageConfidence: number;
    inferenceTime: number;
  };
  attention: {
    totalAtoms: number;
    focusedAtoms: number;
    averageSTI: number;
    totalSTI: number;
  };
  evolution: {
    generation: number;
    populationSize: number;
    bestFitness: number;
    averageFitness: number;
  };
  memory: {
    totalMemories: number;
    experienceCount: number;
    skillCount: number;
    averageImportance: number;
  };
  agents: {
    total: number;
    active: number;
    idle: number;
    error: number;
  };
}

interface PerformanceDashboardProps {
  metrics: PerformanceMetrics;
  updateInterval?: number;
}

export function PerformanceDashboard({
  metrics,
  updateInterval = 1000,
}: PerformanceDashboardProps) {
  const [history, setHistory] = useState<{
    timestamps: number[];
    confidence: number[];
    fitness: number[];
    sti: number[];
  }>({
    timestamps: [],
    confidence: [],
    fitness: [],
    sti: [],
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setHistory((prev) => {
        const now = Date.now();
        const timestamps = [...prev.timestamps, now];
        const confidence = [
          ...prev.confidence,
          metrics.reasoning.averageConfidence,
        ];
        const fitness = [...prev.fitness, metrics.evolution.bestFitness];
        const sti = [...prev.sti, metrics.attention.averageSTI];

        // Keep only last 50 data points
        const maxPoints = 50;
        return {
          timestamps: timestamps.slice(-maxPoints),
          confidence: confidence.slice(-maxPoints),
          fitness: fitness.slice(-maxPoints),
          sti: sti.slice(-maxPoints),
        };
      });
    }, updateInterval);

    return () => clearInterval(interval);
  }, [metrics, updateInterval]);

  return (
    <div className={styles.performanceDashboard}>
      <h3>Performance Dashboard</h3>

      <div className={styles.metricsGrid}>
        {/* Reasoning Metrics */}
        <div className={styles.metricCard}>
          <h4>PLN Reasoning</h4>
          <div className={styles.metricValue}>
            {metrics.reasoning.plnInferences}
          </div>
          <div className={styles.metricLabel}>Inferences</div>
          <div className={styles.metricSubValue}>
            Confidence: {(metrics.reasoning.averageConfidence * 100).toFixed(1)}
            %
          </div>
          <div className={styles.metricSubValue}>
            Time: {metrics.reasoning.inferenceTime.toFixed(2)}ms
          </div>
        </div>

        {/* Attention Metrics */}
        <div className={styles.metricCard}>
          <h4>ECAN Attention</h4>
          <div className={styles.metricValue}>
            {metrics.attention.focusedAtoms}/{metrics.attention.totalAtoms}
          </div>
          <div className={styles.metricLabel}>Focused Atoms</div>
          <div className={styles.metricSubValue}>
            Avg STI: {metrics.attention.averageSTI.toFixed(1)}
          </div>
          <div className={styles.metricSubValue}>
            Total STI: {metrics.attention.totalSTI.toFixed(0)}
          </div>
        </div>

        {/* Evolution Metrics */}
        <div className={styles.metricCard}>
          <h4>MOSES Evolution</h4>
          <div className={styles.metricValue}>
            Gen {metrics.evolution.generation}
          </div>
          <div className={styles.metricLabel}>Generation</div>
          <div className={styles.metricSubValue}>
            Best: {metrics.evolution.bestFitness.toFixed(3)}
          </div>
          <div className={styles.metricSubValue}>
            Avg: {metrics.evolution.averageFitness.toFixed(3)}
          </div>
        </div>

        {/* Memory Metrics */}
        <div className={styles.metricCard}>
          <h4>Agent Memory</h4>
          <div className={styles.metricValue}>
            {metrics.memory.totalMemories}
          </div>
          <div className={styles.metricLabel}>Total Memories</div>
          <div className={styles.metricSubValue}>
            Experiences: {metrics.memory.experienceCount}
          </div>
          <div className={styles.metricSubValue}>
            Skills: {metrics.memory.skillCount}
          </div>
        </div>

        {/* Agent Metrics */}
        <div className={styles.metricCard}>
          <h4>Agent Status</h4>
          <div className={styles.metricValue}>{metrics.agents.total}</div>
          <div className={styles.metricLabel}>Total Agents</div>
          <div className={styles.agentStatus}>
            <span className={styles.statusActive}>
              ● {metrics.agents.active} Active
            </span>
            <span className={styles.statusIdle}>
              ● {metrics.agents.idle} Idle
            </span>
            {metrics.agents.error > 0 && (
              <span className={styles.statusError}>
                ● {metrics.agents.error} Error
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mini Charts */}
      <div className={styles.chartsRow}>
        <div className={styles.miniChart}>
          <h5>Confidence Trend</h5>
          <MiniSparkline data={history.confidence} color="#4a9eff" max={1} />
        </div>
        <div className={styles.miniChart}>
          <h5>Fitness Trend</h5>
          <MiniSparkline data={history.fitness} color="#51cf66" max={1} />
        </div>
        <div className={styles.miniChart}>
          <h5>STI Trend</h5>
          <MiniSparkline data={history.sti} color="#ff6b6b" max={100} />
        </div>
      </div>
    </div>
  );
}

/**
 * Mini sparkline chart component
 */
function MiniSparkline({
  data,
  color,
  max,
}: {
  data: number[];
  color: string;
  max: number;
}) {
  const width = 200;
  const height = 40;

  if (data.length === 0) {
    return <div style={{ width, height, background: "#2a2a2a" }} />;
  }

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1 || 1)) * width;
      const y = height - (value / max) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} style={{ background: "#2a2a2a" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}
