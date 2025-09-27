import { ByteEngineClient } from '@boolbyte/engine';

// Centralized configuration and API client
export const apiKey = import.meta.env.VITE_BYTEENGINE_API_KEY;
export const baseUrl = 'https://api.engine.dev.boolbyte.com/v1';
export const FHIR_SERVER_BASE_URL = import.meta.env.VITE_FHIR_SERVER_BASE_URL || 'http://localhost:8080/fhir';
export const FHIR_API_KEY = import.meta.env.VITE_FHIR_API_KEY;

// Worker IDs (replace with real IDs as needed)
export const WORKER_ID = 'a562d2c7-28eb-4b0b-8602-d4ccf7c60bc7';
export const FHIR_WORKER_ID = '2010ea13-2006-4880-85f9-6dac57e91f85';
export const RADIOLOGY_WORKER_ID = 'ce56fad3-2af9-4e3e-80c8-9bb699aab20b';

if (!apiKey) {
  alert("API key not found. Please create a .env file with VITE_BYTEENGINE_API_KEY='your_key'");
}

export const client = new ByteEngineClient({ apiKey, baseUrl });
