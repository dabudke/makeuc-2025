import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY2 });


export async function normalize(title) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
  Title: "${title}"
  Task: Produce exactly one lowercase English word that best describes the general product type.
  Answer:
  `,
  });
  console.log(response.text);
  return response.text;
}