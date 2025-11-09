import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const title = "pepsi"

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
  Title: "${title}"
  Task: Produce exactly one lowercase English word that best describes the general product type.
  Answer:
  `,
  });
  console.log(response.text);
}

await main();