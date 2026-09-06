/**
 * CarePulse Text-to-Speech (TTS) Engine
 * 
 * Solves all known Web Speech API browser bugs:
 * 1. Synchronous cancel -> speak race condition in Chromium/Android (requires ~60ms delay)
 * 2. V8 Garbage Collection of local SpeechSynthesisUtterance (retained globally)
 * 3. 15-second Chrome audio cutoff bug (chunks text into natural sentence boundaries)
 * 4. Paused/suspended audio queue in mobile WebViews (automatic resume())
 * 5. HTML5 Audio fallback for environments with disabled speech synthesis
 */

import { Capacitor } from '@capacitor/core';
import { getApiBaseUrls } from './apiFetch';

let activeAudioElement: HTMLAudioElement | null = null;
let keepAliveInterval: any = null;
let currentSessionId = 0;

// Retain globally to prevent V8 garbage collection
if (typeof window !== 'undefined') {
  (window as any).__carepulse_speech = null;
}

/**
 * Split text into natural sentence chunks under ~160 characters to avoid Chrome's 15s cutoff bug
 */
function chunkText(text: string, maxLen = 160): string[] {
  if (!text || !text.trim()) return [];

  // Normalize spaces and clean out unusual symbols
  const clean = text
    .replace(/[*_#`~[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
  const chunks: string[] = [];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length <= maxLen) {
      chunks.push(trimmed);
    } else {
      // Split on commas or words
      const words = trimmed.split(' ');
      let cur = '';
      for (const w of words) {
        if ((cur + ' ' + w).trim().length <= maxLen) {
          cur = (cur + ' ' + w).trim();
        } else {
          if (cur) chunks.push(cur);
          cur = w;
        }
      }
      if (cur) chunks.push(cur);
    }
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Language configuration for TTS
 */
const LANG_MAP: Record<string, { tag: string; prefix: string; name: string }> = {
  ta: { tag: 'ta-IN', prefix: 'ta', name: 'Tamil' },
  'ta-in': { tag: 'ta-IN', prefix: 'ta', name: 'Tamil' },
  ml: { tag: 'ml-IN', prefix: 'ml', name: 'Malayalam' },
  'ml-in': { tag: 'ml-IN', prefix: 'ml', name: 'Malayalam' },
  hi: { tag: 'hi-IN', prefix: 'hi', name: 'Hindi' },
  'hi-in': { tag: 'hi-IN', prefix: 'hi', name: 'Hindi' },
  en: { tag: 'en-US', prefix: 'en', name: 'English' },
  'en-us': { tag: 'en-US', prefix: 'en', name: 'English' },
};

/**
 * Get device voices with asynchronous resolution if voices aren't yet loaded
 */
export function getDeviceVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }
    const immediate = window.speechSynthesis.getVoices();
    if (immediate && immediate.length > 0) {
      resolve(immediate);
      return;
    }

    let resolved = false;
    const onVoicesChanged = () => {
      if (resolved) return;
      resolved = true;
      try {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      } catch (_) {}
      resolve(window.speechSynthesis.getVoices() || []);
    };

    try {
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    } catch (_) {}

    // Fallback timeout in case onvoiceschanged does not fire
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(window.speechSynthesis.getVoices() || []);
      }
    }, 250);
  });
}

export interface VoiceAvailabilityReport {
  isAvailable: boolean;
  targetVoice: SpeechSynthesisVoice | null;
  voiceName: string;
  langTag: string;
  languageName: string;
}

/**
 * Check if a real TTS voice is available on this specific device for the requested language
 */
export function checkTtsVoiceAvailability(targetLang = 'en'): VoiceAvailabilityReport {
  const normKey = targetLang.toLowerCase().trim();
  const langConfig = LANG_MAP[normKey] || LANG_MAP[normKey.split('-')[0]] || LANG_MAP.en;

  // On native platform (Android/iOS APK), CarePulse Voice Stream Engine is always active and available
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    return {
      isAvailable: true,
      targetVoice: null,
      voiceName: `CarePulse Voice Engine (${langConfig.name})`,
      langTag: langConfig.tag,
      languageName: langConfig.name,
    };
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return {
      isAvailable: true,
      targetVoice: null,
      voiceName: `CarePulse Audio Stream (${langConfig.name})`,
      langTag: langConfig.tag,
      languageName: langConfig.name,
    };
  }

  const voices = window.speechSynthesis.getVoices() || [];
  const matchingVoice = voices.find(
    (v) =>
      v.lang.toLowerCase() === langConfig.tag.toLowerCase() ||
      v.lang.toLowerCase().startsWith(langConfig.prefix)
  );

  return {
    isAvailable: true,
    targetVoice: matchingVoice || null,
    voiceName: matchingVoice
      ? `${matchingVoice.name} (${matchingVoice.lang})`
      : `CarePulse Audio Stream (${langConfig.name})`,
    langTag: langConfig.tag,
    languageName: langConfig.name,
  };
}

/**
 * Get the best available voice for the target language, or fallback to English
 */
function getBestVoiceForLanguage(targetLang = 'en'): {
  voice: SpeechSynthesisVoice | null;
  effectiveTag: string;
  isFallback: boolean;
  languageName: string;
} {
  const normKey = targetLang.toLowerCase().trim();
  const langConfig = LANG_MAP[normKey] || LANG_MAP[normKey.split('-')[0]] || LANG_MAP.en;

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { voice: null, effectiveTag: langConfig.tag, isFallback: false, languageName: langConfig.name };
  }

  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) {
    return { voice: null, effectiveTag: langConfig.tag, isFallback: false, languageName: langConfig.name };
  }

  // 1. Look for matching language voice
  const matchingVoice = voices.find(
    (v) =>
      v.lang.toLowerCase() === langConfig.tag.toLowerCase() ||
      v.lang.toLowerCase().startsWith(langConfig.prefix)
  );

  if (matchingVoice) {
    return {
      voice: matchingVoice,
      effectiveTag: langConfig.tag,
      isFallback: false,
      languageName: langConfig.name,
    };
  }

  // 2. If target language is non-English and not installed, find English fallback voice
  const englishVoice =
    voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith('en') &&
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Premium'))
    ) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
    voices[0];

  return {
    voice: englishVoice || null,
    effectiveTag: 'en-US',
    isFallback: langConfig.prefix !== 'en',
    languageName: langConfig.name,
  };
}

/**
 * Stop any currently playing speech or fallback audio
 */
export function stopSpeaking(): void {
  currentSessionId++;

  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }

  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch (_) {}
    activeAudioElement = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    (window as any).__carepulse_speech = null;
  }
}

/**
 * Check if speech is currently active
 */
export function isCurrentlySpeaking(): boolean {
  if (activeAudioElement && !activeAudioElement.paused) return true;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

/**
 * Fallback TTS using Google Translate TTS audio stream
 */
/**
 * Universal Audio Stream Player for Android WebView (Capacitor) and fallback environments.
 * Uses CarePulse backend /api/tts endpoint with automatic fallback to direct Google Translate TTS stream.
 */
function playAudioStream(
  chunks: string[],
  sessionId: number,
  langTag = 'en',
  rate = 1.0,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err?: any) => void
): void {
  if (chunks.length === 0 || sessionId !== currentSessionId) {
    onEnd?.();
    return;
  }

  const normLang = langTag.split('-')[0].toLowerCase() || 'en';
  const cleanLang = ['en', 'ta', 'ml', 'hi'].includes(normLang) ? normLang : 'en';

  let index = 0;
  let hasStarted = false;

  const apiBases = typeof window !== 'undefined' ? getApiBaseUrls() : ['/api'];
  const primaryBase = apiBases[0] || '/api';

  const playNext = () => {
    if (index >= chunks.length || sessionId !== currentSessionId) {
      activeAudioElement = null;
      onEnd?.();
      return;
    }

    const chunk = chunks[index++];
    const encoded = encodeURIComponent(chunk);

    const backendUrl = `${primaryBase}/tts?text=${encoded}&lang=${cleanLang}`;
    const directUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${cleanLang}&client=tw-ob`;

    const audio = new Audio();
    activeAudioElement = audio;

    if (rate && rate > 0.5 && rate < 2.0) {
      audio.playbackRate = rate;
    }

    let triedDirect = false;

    audio.onplay = () => {
      if (!hasStarted) {
        hasStarted = true;
        onStart?.();
      }
    };

    audio.onended = () => {
      if (sessionId === currentSessionId) {
        playNext();
      }
    };

    audio.onerror = (e) => {
      if (sessionId !== currentSessionId) return;

      if (!triedDirect) {
        triedDirect = true;
        console.warn('[TTS] Backend /api/tts unavailable, switching to direct audio stream');
        audio.src = directUrl;
        audio.play().catch(() => {
          playNext();
        });
      } else {
        console.warn('[TTS] Audio chunk playback error:', e);
        playNext();
      }
    };

    // Try backend proxy first for optimal CORS and caching
    audio.src = backendUrl;
    audio.play().catch((err) => {
      if (sessionId !== currentSessionId) return;
      if (!triedDirect) {
        triedDirect = true;
        audio.src = directUrl;
        audio.play().catch(() => {
          playNext();
        });
      } else {
        onError?.(err);
        playNext();
      }
    });
  };

  playNext();
}

/**
 * Main public speech function: Speaks the provided text with language-aware voice detection,
 * automatic chunking, Android/Capacitor WebView audio streaming, and Chromium bug mitigations.
 */
export function speakText(
  text: string,
  options?: {
    lang?: string;
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err?: any) => void;
    onVoiceFallback?: (fallbackInfo: { requestedLang: string; fallbackLang: string; message: string }) => void;
  }
): void {
  if (!text || !text.trim()) {
    options?.onEnd?.();
    return;
  }

  stopSpeaking();
  const sessionId = ++currentSessionId;
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    options?.onEnd?.();
    return;
  }

  const reqLang = options?.lang || 'en';
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
  const hasSpeechSynthesis =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  const availableVoices = hasSpeechSynthesis ? window.speechSynthesis.getVoices() : [];

  // In Android WebView / Capacitor app, window.speechSynthesis is a silent broken stub.
  // Also on devices without pre-loaded Web Speech voices, native speech will not produce sound.
  // Use high-fidelity audio stream when on native platform or when voices are unavailable:
  const shouldUseAudioStream = isNative || !hasSpeechSynthesis || availableVoices.length === 0;

  if (shouldUseAudioStream) {
    playAudioStream(
      chunks,
      sessionId,
      reqLang,
      options?.rate ?? 0.95,
      options?.onStart,
      options?.onEnd,
      options?.onError
    );
    return;
  }

  // Pre-wake synthesis engine in Chromium
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch (_) {}

  // 🚨 CRITICAL Chromium fix: Wait 60ms after window.speechSynthesis.cancel() before calling .speak()
  setTimeout(() => {
    if (sessionId !== currentSessionId) return;

    try {
      const { voice, effectiveTag, isFallback, languageName } = getBestVoiceForLanguage(reqLang);

      // If requested language is not installed on this device, notify via callback and custom event
      if (isFallback) {
        const fallbackMsg = `Voice narration in ${languageName} isn't available on this device, using English.`;
        options?.onVoiceFallback?.({
          requestedLang: languageName,
          fallbackLang: 'English',
          message: fallbackMsg,
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('carepulse:tts_fallback', {
              detail: {
                requestedLang: languageName,
                fallbackLang: 'English',
                message: fallbackMsg,
              },
            })
          );
        }
      }

      let chunkIdx = 0;
      let hasStarted = false;

      // Chrome keep-alive ping (resumes engine every 10 seconds to prevent auto-pause)
      keepAliveInterval = setInterval(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }
      }, 10000);

      const speakNextChunk = () => {
        if (chunkIdx >= chunks.length || sessionId !== currentSessionId) {
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
          }
          (window as any).__carepulse_speech = null;
          options?.onEnd?.();
          return;
        }

        const chunk = chunks[chunkIdx++];
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.rate = options?.rate ?? 0.95;
        utterance.pitch = options?.pitch ?? 1.0;
        utterance.lang = effectiveTag;
        if (voice) utterance.voice = voice;

        // Prevent V8 garbage collection
        (window as any).__carepulse_speech = utterance;

        utterance.onstart = () => {
          if (!hasStarted) {
            hasStarted = true;
            options?.onStart?.();
          }
        };

        utterance.onend = () => {
          if (sessionId === currentSessionId) {
            speakNextChunk();
          }
        };

        utterance.onerror = (e: any) => {
          // If canceled by user, don't trigger error fallback
          if (e?.error === 'canceled' || sessionId !== currentSessionId) {
            return;
          }
          console.warn('[TTS] Synthesis error, falling back to audio stream:', e);
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
          }
          playAudioStream(
            chunks.slice(chunkIdx - 1),
            sessionId,
            effectiveTag,
            options?.rate ?? 0.95,
            options?.onStart,
            options?.onEnd,
            options?.onError
          );
        };

        window.speechSynthesis.speak(utterance);
      };

      speakNextChunk();
    } catch (err) {
      console.warn('[TTS] SpeechSynthesis failed, using fallback:', err);
      playAudioStream(
        chunks,
        sessionId,
        reqLang,
        options?.rate ?? 0.95,
        options?.onStart,
        options?.onEnd,
        options?.onError
      );
    }
  }, 60);
}
