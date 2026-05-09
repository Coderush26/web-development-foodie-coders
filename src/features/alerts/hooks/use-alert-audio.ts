"use client";

import { useEffect, useRef } from "react";

import type { FleetAlert } from "@/types/alerts";

type AudioContextWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

async function playAlertTone(severity: FleetAlert["severity"]) {
  const AudioContextConstructor =
    window.AudioContext ?? (window as AudioContextWindow).webkitAudioContext;

  if (!AudioContextConstructor) {
    return;
  }

  const audioContext = new AudioContextConstructor();

  if (audioContext.state === "suspended") {
    await audioContext.resume().catch(() => undefined);
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = severity === "critical" ? "triangle" : "sine";
  oscillator.frequency.value = severity === "critical" ? 880 : 660;
  gainNode.gain.value = 0.0001;

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const startedAt = audioContext.currentTime;

  oscillator.start(startedAt);
  gainNode.gain.exponentialRampToValueAtTime(0.08, startedAt + 0.03);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startedAt + 0.34);
  oscillator.stop(startedAt + 0.36);

  window.setTimeout(() => {
    void audioContext.close();
  }, 420);
}

export function useAlertAudio(alerts: FleetAlert[]) {
  const initializedRef = useRef(false);
  const lastAlertIdRef = useRef<string | null>(null);

  useEffect(() => {
    const newestActiveAlert = alerts.find((alert) => alert.state === "active");

    if (!initializedRef.current) {
      initializedRef.current = true;
      lastAlertIdRef.current = newestActiveAlert?.id ?? null;
      return;
    }

    if (!newestActiveAlert || newestActiveAlert.id === lastAlertIdRef.current) {
      return;
    }

    lastAlertIdRef.current = newestActiveAlert.id;
    void playAlertTone(newestActiveAlert.severity);
  }, [alerts]);
}
