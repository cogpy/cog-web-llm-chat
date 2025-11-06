/**
 * OpenCog Agent Panel Component
 * Displays and manages autonomous agents
 */

"use client";

import React, { useEffect } from "react";
import { useOpenCogStore } from "../../store/opencog";
import styles from "./opencog.module.scss";
import { Agent, AgentStatus } from "../../opencog/types";

export function AgentPanel() {
  const openCogStore = useOpenCogStore();
  const { agents, initialized, showAgentPanel } = openCogStore;

  useEffect(() => {
    if (!initialized) {
      openCogStore.initialize();
    }
  }, [initialized, openCogStore]);

  useEffect(() => {
    if (initialized) {
      const interval = setInterval(() => {
        openCogStore.refreshAgents();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [initialized, openCogStore]);

  if (!showAgentPanel) {
    return null;
  }

  const getStatusColor = (status: AgentStatus): string => {
    switch (status) {
      case AgentStatus.IDLE:
        return "#28a745";
      case AgentStatus.BUSY:
        return "#ffc107";
      case AgentStatus.ERROR:
        return "#dc3545";
      case AgentStatus.OFFLINE:
        return "#6c757d";
      default:
        return "#6c757d";
    }
  };

  return (
    <div className={styles["agent-panel"]}>
      <div className={styles["panel-header"]}>
        <h3>Autonomous Agents</h3>
        <button
          className={styles["close-button"]}
          onClick={() => openCogStore.setShowAgentPanel(false)}
        >
          ✕
        </button>
      </div>

      <div className={styles["agent-list"]}>
        {agents.length === 0 ? (
          <div className={styles["no-agents"]}>No agents registered</div>
        ) : (
          agents.map((agent: Agent) => (
            <div key={agent.id} className={styles["agent-card"]}>
              <div className={styles["agent-header"]}>
                <div className={styles["agent-name"]}>
                  <span
                    className={styles["status-indicator"]}
                    style={{ backgroundColor: getStatusColor(agent.status) }}
                  />
                  {agent.name}
                </div>
                <div className={styles["agent-status"]}>{agent.status}</div>
              </div>
              <div className={styles["agent-role"]}>{agent.role}</div>
              <div className={styles["agent-capabilities"]}>
                {agent.capabilities.map((cap) => (
                  <span key={cap} className={styles["capability-badge"]}>
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
