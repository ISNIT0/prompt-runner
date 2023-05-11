# A POC prompt runner

Building applications on top of LLMs naively leads to fragile features. This attempts to provide an API for retrying and validating LLM outputs.

## Concepts
### LLM App
This is a grouping of prompts. For many applications, you'll want to combine many prompts (other people might call it a prompt-chain). These prompt inferences often dependant on one another in a fairly complex way best defined in code. Grouping is important for logging, traceability, and debugging.

The abstraction provided here borrows heavily from database transactions...

```typescript
const question = "What is the meaning of life, the universe, and everything?";
const finalOutput = await llmApp<string>(
    ConsoleInferenceLogger,
    "Planet Computer", async (infer) => {
    const isValidQuestion = await infer(dav3Provider, questionGuardPrompt, {
        input: question,
    });
    
    if(!isValidQuestion) {
        throw new Error("Invalid question");
    }

    const answer = await infer(dav3Provider, answerPrompt, {
        input: question,
    });

    return answer;
});

console.log(finalOutput); // 42
```


## Usage

```bash
OPENAI_API_KEY="<KEY>" npm run dev
```

## Things to try
In `index.ts`
* Try tweaking the validation rules to it fails.
* Try tweaking the retry count