import PromptSuggestionButton from "./PromptSuggestionButton";

type PromptSuggestionsRowProps = {
    onPromptClick: (promptText: string) => void;
};

const PromptSuggestionsRow = ({ onPromptClick }: PromptSuggestionsRowProps) => {
    const prompts = [
        "Who is head of racing for Aston Martin's F1 Academy Team?",
        "Who is the highest paid F1 driver?",
        "Who is the newest driver for Ferrari?",
        "Who is the current Formula One World Driver's Champion?"
    ]
    return (
        <div className="prompt-suggestion-row">
            {prompts.map((prompt, index) => <PromptSuggestionButton key={`suggestion-${index}`} text={prompt} onClick={() => onPromptClick(prompt)} />)}
        </div>
    )
}

export default PromptSuggestionsRow;