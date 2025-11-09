import express, { response } from "express";

import {
  sustainabilityModuleRouter,
  getSustainabilityInfo,
} from "./sustainability.js";

const app = express();

// Define a route for the root URL
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Set the application to listen on a specific port
const PORT = process.env.PORT;
const IP = process.env.IP;

app.listen(PORT, IP, () => {
  console.log(`Server running on port ${PORT}`);
});

// Serve static files from the public directory
app.use(express.static("public"));

// Add a new route for the /about page
app.get("/about", (req, res) => {
  res.send(
    "<h1>About Us</h1><p>We are a team of developers passionate about Node.js and Express.js.</p>"
  );
});

app.use("/sustainability", sustainabilityModuleRouter);

app.get("/alternatives", async (req, res) => {
  const alternativesList = [];
  console.log("got request for sustainability info");
  const { product } = req.query;
  if (!product) {
    return res
      .status(400)
      .json({ error: "Missing required query parameters: product" });
  }
  try {
    const report = await getSustainabilityInfo(product);
    const w1 = 1;
    const w2 = 1;
    const w3 = 1;
    const w4 = 1;
    const w5 = 1;
    const w6 = 1;

    const sustainabilityScore =
      w1 * report.materials +
      w2 * report.packaging +
      w3 * report.carbonFootprint +
      w4 * report.waterUsage +
      w5 * report.recyclability +
      w6 * report.ethicalLaborPractices;

    const serpAPI_Key = process.env.SERP_API_KEY;
    const params = new URLSearchParams();
    params.append(
      "q",
      `site:amazon.com Sustainable Alternatives to ${product} on Amazon`
    );
    const googleSearchResultsURL = `https://serpapi.com/search?${params.toString()}&api_key=${serpAPI_Key}`;
    const googleSearchResults = await fetch(googleSearchResultsURL);
    const data = await googleSearchResults.json();

    // Print top 5 organic results
    const results = data.organic_results?.slice(0, 4) || [];

    const alternativesList = await Promise.all(
      results.map(async (r) => {
        const alternativeProductReport = await getSustainabilityInfo(r.title);
        const alternativeProductSustainabilityScore =
          w1 * alternativeProductReport.materials +
          w2 * alternativeProductReport.packaging +
          w3 * alternativeProductReport.carbonFootprint +
          w4 * alternativeProductReport.waterUsage +
          w5 * alternativeProductReport.recyclability +
          w6 * alternativeProductReport.ethicalLaborPractices;

        const alternativeProduct = {
          title: r.title,
          link: r.link,
          sustainabilityScore: alternativeProductSustainabilityScore,
        };

        console.log(alternativeProduct);
        return alternativeProduct;
      })
    );

    const result = {
      sustainabilityScore: sustainabilityScore,
      alternatives: alternativesList,
    };
    console.log(result);
    res.json(result);
  } catch (error) {
    console.error("Error generating sustainability report:", error);
    res.status(500).json({ error: "Failed to generate sustainability report" });
  }
});
