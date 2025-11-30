import { type UIMessage, streamText, convertToModelMessages } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { DataAPIClient } from "@datastax/astra-db-ts";
import OpenAI from "openai";
// import Stream from "stream";

const { 
    ASTRA_DB_NAMESPACE, 
    ASTRA_DB_COLLECTION, 
    ASTRA_DB_API_ENDPOINTS, 
    ASTRA_DB_APPLICATION_TOKEN, 
    OPENAI_API_KEY 
} = process.env

export const runtime = "edge";

const openaiEmbeddings = new OpenAI({ apiKey: OPENAI_API_KEY });

const openai = createOpenAI({ apiKey: OPENAI_API_KEY });

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
const db = client.db(ASTRA_DB_API_ENDPOINTS!, { namespace: ASTRA_DB_NAMESPACE! });

function getLatestUserText(messages: UIMessage[]): string {
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (!lastUser) return "";

    return (
        lastUser.parts
        ?.filter(p => p.type === "text")
        .map(p => (p as any).text)
        .join(" ")
        .trim() ?? ""
    );
}

export async function POST(req: Request){
    // const { messages } = await req.json()
    try{
        const { messages }: { messages: UIMessage[] } = await req.json();

        const latestMessage = getLatestUserText(messages);
        if (!latestMessage) {
            return new Response("No message provided", { status: 400 });
        }

        let docContext = "";

        try{
            const embedding = await openaiEmbeddings.embeddings.create({
                model: "text-embedding-3-small",
                input: latestMessage,
                encoding_format: "float",
            })

            const collection = await db.collection(ASTRA_DB_COLLECTION!);

            const cursor = collection.find({}, {
                    sort: {
                        $vector: embedding.data[0].embedding,
                    },
                    limit: 10,
                })

                const documents = await cursor.toArray()
                // const docsMap = documents?.map(doc => doc.text)

                docContext = documents.map((d: any) => d.text).join("\n\n");
        }
        catch(err){
            console.log("Error quering db...", err);
            docContext = "";
        }
            

        const systemPrompt = {
            role: "system" as const,
            content: `You are an AI assistant who knows everything about Formula One.
            Use the below context to argument what you know about Formula One racing.
            The context will provide you with the most recent page data from wikipedia,
            the official F1 website and others.
            If the context doesn't include the information you need answer based on your
            existing knowledge and don't mention the source of your information or
            what the context does or doesn't include.
            Format responses using markdown where applicable and doesn't return
            images.
            -----------------
            START CONTENT
            ${docContext}
            END CONTENT
            -----------------
            QUESTION: ${latestMessage}
            -----------------
        `
        }

            const result = await streamText({
                model: openai("gpt-4o-mini"),
                messages: convertToModelMessages(messages),
            })

            // const stream = OpenAIStream(response)
            // return new StreamingTextResponse(stream)

            return result.toUIMessageStreamResponse();
    }
    catch(err){
        console.log("Error in POST handler: ", err);
        return new Response("Internal Server Error", { status: 500 });
    }

    
}
