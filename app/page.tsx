"use client"
import Image from "next/image";
import { useChat } from "@ai-sdk/react";
import { useState, FormEvent } from "react";
import Bubble from "./components/Bubble";
import LoadingBubble from "./components/LoadingBubble";
import PromptSuggestionsRow from "./components/PromptSuggestionsRow";


const Home = () => {
    const { messages, sendMessage, status } = useChat();
    const [input, setInput] = useState("");


    const noMessages = !messages || messages.length === 0;
    const isLoading = status === "streaming" || status === "submitted";

    const handlePrompt = ( promptText: string ) =>{
        sendMessage({
            role: "user",
            parts: [{ type: "text", text: promptText }],
        })
    }

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if(!input.trim()) return;

        // sendMessage(input);
        sendMessage({
            role: "user",
            parts: [{ type: "text", text: input }]
        })
        setInput("");
    }
    

    return(
        <main>
            <Image src="/assets/F1LOGO.png" width={250} height={100} alt="F1GPT Logo" />
            <section className={noMessages ? "" : "populated"}>
                {noMessages ? (
                    <>
                        <p className="starter-text">
                            The Ultimate place for Formula One super fans!
                            Ask F1GPT anything about the fantastic topic of F1 racing
                            and it will come back with the most up-to-date answers.
                            We hope you enjoy!
                        </p>
                        <br />
                        <PromptSuggestionsRow onPromptClick={handlePrompt} />
                    </>
                ) : (
                    <>
                        {messages.map((message, index) => (
                            <Bubble key={`message-${index}`} message={message} />
                            ))}
                        {isLoading && <LoadingBubble />}   
                    </>
                )}
                
            </section>
            <form onSubmit={onSubmit}>
                <input className="question-box" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me something..." />
                <input type="submit" />
            </form>
        </main>
    )
}

export default Home;


