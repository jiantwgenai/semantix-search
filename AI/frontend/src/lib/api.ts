// semantix-document-search/src/lib/api.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';
// const API_BASE_URL = 'http://18.224.79.195:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const uploadDocuments = async (files: File[]) => {
  try {
    const formData = new FormData();
    files.forEach((file) => {
      console.log('Appending file to FormData:', file.name);
      formData.append('files', file);
    });
    
    console.log('Sending upload request to:', `${API_BASE_URL}/documents/upload`);
    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
    });
    
    console.log('Upload response:', response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Upload error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(error.response?.data?.message || error.message);
    }
    console.error('Upload error:', error);
    throw error;
  }
};

export const login = async (email: string, password: string) => {
  try {
    const response = await api.post('/auth/login', {
      email,
      password
    });
    
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    return { token, user };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Login error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(error.response?.data?.message || error.message);
    }
    console.error('Login error:', error);
    throw error;
  }
};

export const searchDocuments = async (query: string, options: { mode: "semantic" | "keyword" }) => {
  try {
    const token = localStorage.getItem('token');
    console.log('Searching with token:', token);

    if (!token) {
      throw new Error('No authentication token found');
    }

    console.log('Sending search request:', { query, options });
    const response = await api.post('/documents/search', {
      query,
      mode: options.mode
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Search response:', response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Search error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw new Error(error.response?.data?.message || error.message);
    }
    console.error('Search error:', error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('token');
};

export async function register(email: string, password: string) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (response.status !== 200 && response.status !== 201) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Registration failed");
  }
  return response.json();
}