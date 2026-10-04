"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Minimal Web Speech API surface (not in TypeScript's DOM lib everywhere). */
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * French dictation with the browser's Web Speech API. `supported` is false where
 * the API is missing (then the UI asks to use the keyboard's microphone).
 * Server transcription can plug in later behind the same interface.
 */
export function useSpeech(onText: (finalText: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recognition = useRef<Recognition | null>(null);

  useEffect(() => {
    // Feature detection must run after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(recognitionCtor() !== null);
    return () => recognition.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "fr-FR";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (event) => {
      let live = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) onText(result[0].transcript.trim());
        else live += result[0].transcript;
      }
      setInterim(live);
    };
    r.onend = () => {
      setListening(false);
      setInterim("");
    };
    r.onerror = () => setListening(false);
    recognition.current = r;
    r.start();
    setListening(true);
  }, [onText]);

  const stop = useCallback(() => recognition.current?.stop(), []);

  return { supported, listening, interim, start, stop };
}
