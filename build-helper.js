import fs from 'fs';

// Check if .env file exists
const envFileExists = fs.existsSync('.env');

if (!envFileExists) {
  console.log('Creating .env file from environment variables...');
  let envContent = '';
  
  // Add critical variables from process.env to .env file
  if (process.env.VITE_SUPABASE_URL) {
    envContent += `VITE_SUPABASE_URL=${process.env.VITE_SUPABASE_URL}\n`;
  }
  
  if (process.env.VITE_SUPABASE_ANON_KEY) {
    envContent += `VITE_SUPABASE_ANON_KEY=${process.env.VITE_SUPABASE_ANON_KEY}\n`;
  }
  
  if (process.env.VITE_GEMINI_API_KEY) {
    envContent += `VITE_GEMINI_API_KEY=${process.env.VITE_GEMINI_API_KEY}\n`;
  }
  
  fs.writeFileSync('.env', envContent);
  console.log('.env file created successfully.');
}

console.log('Environment check complete, proceeding with build...');
