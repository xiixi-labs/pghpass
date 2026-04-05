import axios from 'axios';
import { useMemo } from 'react';
import { Platform } from 'react-native';

const CONFIGURED_URL = process.env.EXPO_PUBLIC_API_URL;
const DEV_MODE = !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function getApiUrl() {
  if (CONFIGURED_URL) return CONFIGURED_URL;
  if (Platform.OS === 'web' && DEV_MODE) return 'http://localhost:63900';
  return 'http://localhost:3000';
}

export function useApi() {
  const getToken = DEV_MODE
    ? null
    : (() => {
        const { useAuth } = require('@clerk/clerk-expo');
        return useAuth().getToken;
      })();

  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: `${getApiUrl()}/v1`,
      timeout: 10000,
    });

    if (getToken) {
      instance.interceptors.request.use(async (config) => {
        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      });
    }

    return instance;
  }, [getToken]);

  return api;
}
