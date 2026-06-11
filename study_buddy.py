import anthropic

# Which Claude model to use:
#   "claude-haiku-4-5" = fastest + cheapest  -> best for learning/experimenting
#   "claude-opus-4-8"  = most capable        -> best answers, costs more
MODEL = "claude-haiku-4-5"

# Reads your API key from the ANTHROPIC_API_KEY environment variable.
client = anthropic.Anthropic()

SYSTEM_PROMPT = (
    "You are a friendly, encouraging AI tutor for someone learning AI and "
    "prompt engineering. Explain things simply and clearly, use plain language, "
    "give small concrete examples, and keep answers short."
)


def ask_tutor(question):
    """Send the user's question to Claude and return the text answer."""
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": question}],
    )
    # The response is a list of blocks; grab the first text block.
    return next((b.text for b in response.content if b.type == "text"), "")


def main():
    print("AI Study Buddy - ask me anything about what you're learning.")
    print("(type 'quit' to exit)\n")

    while True:
        question = input("You: ").strip()
        if question.lower() in ("quit", "exit", "q"):
            print("Keep going. See you next study session.")
            break
        if not question:
            continue

        print("\nTutor: ", end="", flush=True)
        try:
            print(ask_tutor(question) + "\n")
        except anthropic.AuthenticationError:
            print("\n[Error] API key missing or invalid. "
                  "Set ANTHROPIC_API_KEY and try again.\n")
            break
        except anthropic.APIError as e:
            print(f"\n[Error] Problem talking to Claude: {e}\n")


if __name__ == "__main__":
    main()
