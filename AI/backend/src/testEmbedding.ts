import { generateEmbedding } from './services/embedding.services';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './src/.env' });

async function testEmbedding() {
  try {
    console.log('Testing embedding service...');
    const testText = 'This is a test sentence to check the embedding dimension.';
    
    console.log('Generating embedding for test text...');
    const embedding = await generateEmbedding(testText);
    
    console.log('\nTest Results:');
    console.log('----------------');
    console.log('Vector Dimension:', embedding.length);
    console.log('Expected Dimension: 4096');
    console.log('Match:', embedding.length === 4096 ? '✅' : '❌');
    console.log('\nFirst 5 values of the embedding:');
    console.log(embedding.slice(0, 5));
    
    if (embedding.length !== 4096) {
      console.error('\n⚠️ Warning: The embedding dimension does not match the database schema!');
      console.error('Please ensure your embedding service is configured to generate 4096-dimensional vectors.');
    }
  } catch (error) {
    console.error('Error testing embedding service:', error);
  }
}

// Run the test
testEmbedding(); 