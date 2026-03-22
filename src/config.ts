interface Config {
  USE_MOCK_DATA: boolean;
  API_BASE_URL: string;
}

export const CONFIG: Config = {
  USE_MOCK_DATA: import.meta.env.VITE_USE_MOCK_DATA === 'true' || false,
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
};
