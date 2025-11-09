import z from "zod";
import { GoogleGenAI } from "@google/genai";

const sustainabilitySchema = z.object({
  carbonFootprint: z.number().describe("A number ranging from 0.0 to 10.0 indicating an estimated score of the product's carbon footprint, where 0.0 is very low and 10.0 is very high."),
  carbonFootprintDetails: z.string().describe("A detailed explanation of the factors contributing to the product's carbon footprint score."),
  waterUsage: z.number().describe("A number ranging from 0.0 to 10.0 indicating an estimated score of the product's water usage during its lifecycle, where 0.0 is very low and 10.0 is very high."),
  waterUsageDetails: z.string().describe("A detailed explanation of the factors contributing to the product's water usage score."),
  recyclability: z.number().describe("A number ranging from 0.0 to 10.0 indicating an estimated score of the product's recyclability, where 0.0 is not recyclable and 10.0 is fully recyclable."),
  recyclabilityDetails: z.string().describe("A detailed explanation of the factors contributing to the product's recyclability score."),
  ethicalLaborPractices: z.number().describe("A number ranging from 0.0 to 10.0 indicating an estimated score of the product's adherence to ethical labor practices, where 0.0 is poor and 10.0 is excellent."),
  ethicalLaborPracticesDetails: z.string().describe("A detailed explanation of the factors contributing to the product's ethical labor practices score."),
  // overallSustainabilityScore: z.number().describe("A number ranging from 0.0 to 10.0 indicating an overall sustainability score for the product, where 0.0 is very poor and 10.0 is excellent."),
})


const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getSustainabilityInfo(merchant, product) {
  const researchPrompt = `You are a sustainability expert. Research the company "${merchant}" and its product "${product}" and provide a detailed evaluation of the products sustainability in the following categories: carbon footprint, water usage, recyclability, and ethical labor practices. Use the provided tools as necessary to gather accurate and up-to-date information.`;

  const research = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: researchPrompt,
    config: {
      temperature: 0,
      tools: [
        {
          googleSearch: {},
        }
      ],
    },
  });

  console.log(research.text);

  const summaryPrompt = `Based on the following report by an expert, provide a JSON object adhering to the specified schema that summarizes the research about the sustainability of the product "${product}" from the company "${merchant}". Include scores ranging from 0.0 to 10.0 for each category, as well as a simplified explanation for each score. This explanation should be no more than 2 or 3 lines, and the score should have no more than one decimal point.`
  const summary = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [summaryPrompt, research.text],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(sustainabilitySchema),
    },
  })

  const report = sustainabilitySchema.parse(JSON.parse(summary.text));
  console.log(report);
  return report;
}
