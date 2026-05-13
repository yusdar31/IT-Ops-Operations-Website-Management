import axios from 'axios';

function buildClient(baseURL) {
  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return client;
}

const authApi = buildClient(import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3001/api');
const assetApi = buildClient(import.meta.env.VITE_ASSET_API_URL || 'http://localhost:3002/api');
const ticketApi = buildClient(import.meta.env.VITE_TICKET_API_URL || 'http://localhost:3003/api');

export { authApi, assetApi, ticketApi };
export default authApi;
