/**
 * Audio Recorder Service
 * Serviço de captura de áudio usando MediaRecorder
 */

import type { AudioRecorderConfig, RecordingResult } from './asr-types';

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingStartTime = 0;
let config: AudioRecorderConfig = {};

/**
 * Inicializa o recorder com configuração opcional
 */
export function initRecorder(userConfig?: AudioRecorderConfig): void {
  config = userConfig ?? {};
}

/**
 * Solicita acesso ao microfone e inicia a gravação
 */
export async function startRecording(): Promise<void> {
  // Se já está gravando, não fazer nada
  if (isRecording()) {
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mimeType = config.mimeType ?? getSupportedMimeType();
    const options = mimeType ? { mimeType } : undefined;

    mediaRecorder = new MediaRecorder(stream, options);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.start(100); // Coleta chunks a cada 100ms
    recordingStartTime = Date.now();
  } catch (error) {
    mediaRecorder = null;
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Para a gravação e retorna o resultado
 */
export async function stopRecording(): Promise<RecordingResult> {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      reject(new Error('Nenhuma gravação em andamento'));
      return;
    }

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: config.mimeType ?? 'audio/webm' });
      const duration = (Date.now() - recordingStartTime) / 1000;

      // Para todos os tracks do stream
      mediaRecorder?.stream.getTracks().forEach((track) => { track.stop(); });

      mediaRecorder = null;
      audioChunks = [];

      resolve({ audioBlob, duration });
    };

    mediaRecorder.stop();
  });
}

/**
 * Retorna true se está gravando
 */
export function isRecording(): boolean {
  return mediaRecorder !== null && mediaRecorder.state === 'recording';
}

/**
 * Retorna o tipo MIME suportado pelo navegador
 */
function getSupportedMimeType(): string {
  const possibleTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg',
  ];

  for (const type of possibleTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return '';
}

/**
 * Extrai mensagem de erro amigável
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'Permissão do microfone negada';
    }
    if (error.name === 'NotFoundError') {
      return 'Microfone não encontrado';
    }
    return error.message;
  }
  return 'Erro ao acessar microfone';
}
