/**
 * ASR Types
 * Tipos para o módulo de reconhecimento de fala
 */

export type RecordingState = 'idle' | 'recording' | 'processing' | 'error';

export interface AudioRecorderConfig {
  /** Tipo MIME para gravação */
  mimeType?: string;
}

export interface RecordingResult {
  /** Blob de áudio gravado */
  audioBlob: Blob;
  /** Duração em segundos */
  duration: number;
}
