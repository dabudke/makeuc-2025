import { GoogleGenAI, TurnCompleteReason } from "@google/genai";
import { da } from "zod/v4/locales";

const vector_DB_URL = process.env.VECTOR_DB_URL;
const vector_DB_TOKEN = process.env.VECTOR_DB_TOKEN;

async function getEmbeding(title) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: title,
    config: {
      outputDimensionality: 768,
    },
  });
  return response.embeddings;
}

export async function insertTitle(title, ASIN = 0,score=0) {
  const embeddings = await getEmbeding(title);
  const vector = embeddings[0]["values"];
  console.log(vector);

  const postData = {
    collectionName: "collection",
    data: [{ vector: vector, ASIN: ASIN,score: score,title:title}],
  };

  const url = `${vector_DB_URL}/insert`;
  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vector_DB_TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

export async function searchTitle(title) {
  const vectorDB = process.env.VECTOR_DB_URL;
  const embeddings = await getEmbeding(title);
  const vector = embeddings[0]["values"];
  console.log(vector);

  const postData = {
    collectionName: "collection",
    data: [vector],
    limit: 3,
    outputFields: ["ASIN","score","title"],
  };

  const url = `${vector_DB_URL}/search`;
  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vector_DB_TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    console.log(data["data"]);

    return data["data"];
  } catch (error) {
    console.error(error);
    return Error;
  }
}

export async function isTitleInVectorDatabase(title) {
  const searchResult = await searchTitle(title);
  const embeddings = await getEmbeding(title);
  const vector = embeddings[0]["values"];
  if(vector == searchResult[0]["vector"]){
    return true;
  }
  return false;
}

// Output:
// "data": [
//     {
//       "ASIN": "0",
//       "distance": -0.013442018,
//       "primary_key": 461825177039325835,
//       "vector": []}]
