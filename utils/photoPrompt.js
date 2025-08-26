import { InferenceClient } from "@huggingface/inference";
import 'dotenv/config';

const client = new InferenceClient(process.env.HF_TOKEN);

// Step 1: Generate a visual prompt from location
export async function generatePhotoPrompt(location, notes, tone) {
  const prompt = `A scenic view that captures the essence of ${location}, in a ${tone} style, inspired by this memory: ${notes}`;
  
  const imageBlob = await client.textToImage({
    model: process.env.HF_IMAGE_MODEL, // You can swap this with another image model
    inputs: prompt
  });

  return imageBlob; // This is a Blob object you can stream, save, or display
}
