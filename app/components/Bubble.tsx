export type ChatMessage = {
    id: string;
    role: "user" | "assistant" | "system";
    parts: { type: string; text?: string }[];
};

type BubbleProps = {
    message: ChatMessage;
};

const Bubble = ({ message }: BubbleProps) => {
    // const { content, role } = message
    const textPart = message.parts.find((part) => part.type === "text");
    const content =  textPart?.text ?? "";

    return (
        <div className={`bubble ${message.role}`}>{content}</div>
    )
}

export default Bubble;