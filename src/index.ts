import { OAITextDavinci3Provider } from "./openai";
import { IInferenceRequest, infer } from "./promptRunner";

const questionGuardPrompt: IInferenceRequest<{ input: string }> = {
  prompt: async ({ input }) => {
    return `Is "${input}" a question that an analyst might ask about their product? Answer exactly as one of 'yes' or 'no' in lower case
A: `;
  },
  validation: {
    enum: ["Yes", "no"], // If output is not one of these values, retry or fail
  },
  retry: {
    max: 3, // Number of retries before failing
  },
};

const eventTypeSelectionPrompt: IInferenceRequest<{
  input: string;
  eventTypes: string[];
}> = {
  prompt: async ({ input, eventTypes }) => {
    return `Select between 0 and 3 events from below that best answer the question "${input}":
${eventTypes.join("\n")}

Answer as a JSON array, e.g. ["Add to Cart", "Complete Purchase"]
A: `;
  },
  validation: {
    type: "json",
    validate: async (result: string, { eventTypes }) => {
      const parsedResult: string[] = JSON.parse(result);
      return parsedResult.every((val) => eventTypes.includes(val));
    },
  },
  retry: {
    max: 5,
  },
};

// Things to think about
// 1. Grouping inferences by inference flow so they can be grouped together in logging
//

async function app() {
  const dav3Provider = new OAITextDavinci3Provider();

  const ret = await infer(dav3Provider, questionGuardPrompt, {
    input: "How many users logged in over the last month?",
    // input: "How many bananas?",
  });

  console.info(`Output:`, ret);
}

app().catch((err) => console.error(err));
