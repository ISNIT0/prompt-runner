import { ConsoleInferenceLogger } from "./logger";
import { OAITextDavinci3Provider } from "./openai";
import { IInferenceRequest, llmApp } from "./promptRunner";

const questionGuardPrompt: IInferenceRequest<{ input: string }> = {
  friendlyName: "Question Guard",
  prompt: async ({ input }) => {
    return `Is "${input}" a question that an analyst might ask about their product? Answer exactly as one of 'yes' or 'no' in lower case
A: `;
  },
  validation: {
    enum: ["yes", "no"], // If output is not one of these values, retry or fail
  },
  retry: {
    max: 3, // Number of retries before failing
  },
};

const eventTypeSelectionPrompt: IInferenceRequest<{
  input: string;
  eventTypes: string[];
}> = {
  friendlyName: "Event Type Selection",
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

async function app() {
  const dav3Provider = new OAITextDavinci3Provider();

  const finalOutput = await llmApp<string>(
    ConsoleInferenceLogger,
    "My First App",
    async (infer) => {
      const ret = await infer(dav3Provider, questionGuardPrompt, {
        input: "How many users logged in over the last month?",
        // input: "How many bananas?",
      });

      if (ret) {
        return "Success! " + ret;
      } else {
        return "Failed!";
      }
    }
  );

  console.info(`Output:`, finalOutput);
}

app().catch((err) => console.error(err));
