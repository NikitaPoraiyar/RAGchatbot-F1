import { DataAPIClient } from "@datastax/astra-db-ts"
import { PuppeteerWebBaseLoader } from "langchain/document_loaders/web/puppeteer"
import OpenAI from "openai"

import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"

import "dotenv/config"

type SimilarityMetric = "dot_product" | "cosine" | "euclidean"

const { 
    ASTRA_DB_NAMESPACE, 
    ASTRA_DB_COLLECTION, 
    ASTRA_DB_API_ENDPOINTS, 
    ASTRA_DB_APPLICATION_TOKEN, 
    OPENAI_API_KEY 
} = process.env

if (!ASTRA_DB_APPLICATION_TOKEN) {
    throw new Error("ASTRA_DB_APPLICATION_TOKEN is not defined in .env");
}
if (!ASTRA_DB_API_ENDPOINTS) {
    throw new Error("ASTRA_DB_API_ENDPOINTS is not defined in .env");
}
if (!ASTRA_DB_NAMESPACE) {
    throw new Error("ASTRA_DB_NAMESPACE is not defined in .env");
}
if (!ASTRA_DB_COLLECTION) {
    throw new Error("ASTRA_DB_COLLECTION is not defined in .env");
}
if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not defined in .env");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

const f1Data = [
    'https://en.wikipedia.org/wiki/Formula_One',
    'https://en.wikipedia.org/wiki/History_of_Formula_One',
    'https://en.wikipedia.org/wiki/List_of_Formula_One_drivers',
    'https://en.wikipedia.org/wiki/List_of_Formula_One_circuits',
    'https://en.wikipedia.org/wiki/List_of_Formula_One_grand_prix_winners',
    'https://en.wikipedia.org/wiki/Formula_One_racing_cars',
    'https://en.wikipedia.org/wiki/Formula_One_teams',
    'https://en.wikipedia.org/wiki/Formula_One_technology',
    'https://en.wikipedia.org/wiki/Formula_One_regulations',
    'https://www.formula1.com/en/latest',
    'https://www.formula1.com/en/results.html',
    'https://www.formula1.com/en/drivers.html',
    'https://www.formula1.com/en/teams.html',
    'https://www.formula1.com/en/drivers',
    'https://www.formula1.com/en/teams',
    'https://www.formula1.com/en/results/2025/races'
]

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINTS, { namespace: ASTRA_DB_NAMESPACE });

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100,
})

const createCollection = async (similarityMetric: SimilarityMetric = "dot_product") => {
    try{
        const res = await db.createCollection(ASTRA_DB_COLLECTION,{
            vector: {
                dimension: 1536,
                metric: similarityMetric
            },
        });
        console.log(res)
    }
    catch(err: any){
        if (err.name === "CollectionAlreadyExistsError" || err.message?.includes("already exists")) {
            console.log(`Collection "${ASTRA_DB_COLLECTION}" already exists, skipping creation.`);
        } 
        else {
            console.error("Error creating collection:", err);
            throw err;
        }
    }
};

const loadSampleData = async () => {
    const collection = await db.collection(ASTRA_DB_COLLECTION);
    console.log("Using collection:", ASTRA_DB_COLLECTION);

    for await (const url of f1Data){
        console.log(`Scraping: ${url}`);
        const content = await scrapePage(url)

        if (!content || !content.trim()) {
            console.warn(`No content scraped from: ${url}`);
            continue;
        }

        const chunks = await splitter.splitText(content);
        console.log(`Got ${chunks.length} chunks from ${url}`);

        for await( const chunk of chunks ){
            try{
                const embedding = await openai.embeddings.create({
                    model: "text-embedding-3-small",
                    input: chunk,
                    encoding_format: "float",
                });
                const vector = embedding.data[0].embedding;
                if (!vector || vector.length !== 1536) {
                    console.error("Invalid vector length:", vector?.length);
                    continue;
                }

                const res = await collection.insertOne({
                    $vector: vector,
                    text: chunk,
                    source: url,
                });
                console.log(res);
            }
            catch(err){
                console.error("Error inserting chunk for url: ", url, err);
            }
            
        }

    }
}

const scrapePage = async (url: string) => {
    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: {
            headless: true
        },
        gotoOptions: {
            waitUntil: "domcontentloaded"
        },
        evaluate: async(page, browser) => {
            const result = await page.evaluate(() => document.body.innerHTML);
            await browser.close()
            return result
        }
    });
    return ( await loader.scrape())?.replace(/<[^>]*>?/gm, '')
}

createCollection().then(() => loadSampleData())

