// semantix-document-search/src/lib/api.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const uploadDocuments = async (files: File[]) => {
  try {
    const token = localStorage.getItem('token');
    console.log('Using token:', token); // Debug log

    if (!token) {
      console.error('No authentication token found in localStorage');
      throw new Error('No authentication token found');
    }

    const formData = new FormData();
    files.forEach((file) => {
      console.log('Appending file to FormData:', file.name);
      formData.append('file', file);
    });
    
    console.log('Sending upload request to:', `${API_BASE_URL}/documents/upload`);
    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
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