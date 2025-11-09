## EcoCart

Participants: Daniel Budke, Atharv Singh, Tam Le, Maite Peña
## Inspiration
Online shopping makes it easy to fill up your cart, but it can be hard to know which products are truly worth buying. With so many options, comparing prices and sustainability can quickly become overwhelming.
We wanted to create a simple way to help people make better choices for both their wallets and the planet. That is why we built EcoCart, a Chrome extension that uses AI to analyze your shopping cart and highlight the most affordable and environmentally friendly products, all without leaving the page.

## What it does
EcoCart is a Chrome extension designed to make online shopping smarter and more sustainable. When users browse their cart on a shopping site, the extension automatically scans the listed products and uses AI to analyze each item’s affordability and environmental impact.
It then highlights which products offer the best balance between price and sustainability, allowing users to identify the most budget-friendly and eco-conscious choices in just one click. Everything happens directly on the page, helping shoppers make informed and responsible decisions without interrupting their shopping experience.

## How we built it
We built a Chrome Extension with **React** along with a **Node.js** backend hosted on **Render** using a **.tech domain**.
We are using **SerpAPI** to get a pool of sustainable alternative then we are measure the sustainability score of those products
We first used **Zero-Shot Classification** (Facebook/Bart-Large-MLNI on Hugging Face) to turn the Amazon Product Names into categories for more accurate searches.
We also used **Gemini API** for normalization of the Product Names into a single word for relavant searches using a **Vector Database (Zilli)**
All of this data is fed into the **Gemini API** to get a grounded search about the sustainable practices by manufacturing companies to get a Sustainability Score.
In addition, to help find related products, we use **Gemini API Embeddings** to determine relation information about a product, and store it in a vector database to easily find related products to the one currently being researched.

## Challenges we ran into
One of our main challenges was connecting the user interface with the backend. Since it was our first time building a Chrome extension, we struggled to properly link the data flow between the popup, content scripts, and background logic. We also weren’t sure where or how to store user data securely, which made it difficult to keep track of analyzed items and results.

## Accomplishments that we're proud of
We’re proud of how we came up with the idea and brought it to life in just 24 hours. It was our first time building a Chrome extension, and we managed to make the main features work while learning how to use the Gemini API along the way.

## What we learned
We learned how the Gemini API works and how to integrate it into a Chrome extension to analyze product data. It was also our first time building a Chrome extension, so we learned how its structure, manifest files, and permissions work to make everything run smoothly together.

## What's next for EcoCart
We want to make EcoCart even smarter and easier to use. We plan to improve how our AI checks if products are affordable and eco-friendly by connecting it with real sustainability data.
We also want to add new features, like saving past results, giving users personalized tips, and making it work on more shopping websites. Our goal is to turn EcoCart into a helpful tool that makes online shopping greener and better for everyone.
