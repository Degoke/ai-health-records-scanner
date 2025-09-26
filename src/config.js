import { ByteEngineClient } from '@boolbyte/engine';

// Centralized configuration and API client
export const apiKey = import.meta.env.VITE_BYTEENGINE_API_KEY;
export const baseUrl = 'http://localhost:3000/v1';
export const FHIR_SERVER_BASE_URL = import.meta.env.VITE_FHIR_SERVER_BASE_URL || 'http://localhost:8080/fhir';

// Worker IDs (replace with real IDs as needed)
export const WORKER_ID = 'af088ba1-c27a-4641-aa73-c7f24bf6b047';
export const FHIR_WORKER_ID = '75d5fbfa-c9f0-46cc-a308-13a4fb6a9672';
export const RADIOLOGY_WORKER_ID = '4520848e-5ee5-43aa-b326-3688b0339bc0';

if (!apiKey) {
  alert("API key not found. Please create a .env file with VITE_BYTEENGINE_API_KEY='your_key'");
}

export const client = new ByteEngineClient({ apiKey, baseUrl });


