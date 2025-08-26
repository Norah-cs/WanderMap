import { InferenceClient } from "@huggingface/inference";
import 'dotenv/config';

const client = new InferenceClient(process.env.HF_TOKEN);

export async function generateMemoryPrompt(location, tone = "poetic") {
  const messages = [
    {
      role: "user",
      content: `Write a ${tone} memory prompt for someone who visited ${location}. Make it short and sweet for a caption`
    }
  ];

  const response = await client.chatCompletion({
    provider: "auto",
    model: process.env.HF_TEXT_MODEL,
    messages
  });

  return response.choices[0].message.content;
}
