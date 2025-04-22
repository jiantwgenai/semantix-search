import axios from 'axios';
import debug from 'debug';

const log = debug('app:embedding');

const LLAMA_API_URL = process.env.EMBEDDING_API_URL || 'http://localhost:5000';
const LLAMA_MODEL = process.env.LLAMA_MODEL || 'llama2';

// Create axios instance with increased maxBodyLength
const axiosInstance = axios.create({
  maxBodyLength: Infinity,
  maxContentLength: Infinity
});

export const testEmbeddingService = async (): Promise<boolean> => {
  try {
    log('Testing embedding service connection...');
    const response = await axiosInstance.get(`${LLAMA_API_URL}/health`);
    log('Embedding service health check response:', response.data);
    return response.status === 200;
  } catch (error) {
    log('Error testing embedding service:', error);
    return false;
  }
};

export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    log('Generating embedding for text length:', text.length);
    
    const response = await axiosInstance.post(`${LLAMA_API_URL}/embed`, {
      text,
      model: LLAMA_MODEL
    });

    if (!response.data || !Array.isArray(response.data.embedding)) {
      log('Invalid response from embedding service:', response.data);
      throw new Error('Invalid response from embedding service');
    }

    // Get the embedding from the response
    const embedding = response.data.embedding;

    // Log the embedding details for debugging
    log('Raw embedding details:', {
      length: embedding.length,
      firstFew: embedding.slice(0, 5),
      magnitude: Math.sqrt(embedding.reduce((sum: number, val: number) => sum + val * val, 0))
    });

    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum: number, val: number) => sum + val * val, 0));
    const normalizedEmbedding = embedding.map((val: number) => val / magnitude);

    log('Normalized embedding details:', {
      length: normalizedEmbedding.length,
      firstFew: normalizedEmbedding.slice(0, 5),
      magnitude: Math.sqrt(normalizedEmbedding.reduce((sum: number, val: number) => sum + val * val, 0))
    });

    return normalizedEmbedding;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: error.config
      });
    }
    log('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};