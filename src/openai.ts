import { OpenAIApi, Configuration } from "openai";
import { IModelProvider } from "./promptRunner";

export class OAITextDavinci3Provider implements IModelProvider<string> {
  private openai: OpenAIApi;
  constructor() {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);
    this.openai = openai;
  }

  async infer(config: Record<string, any>, prompt: string): Promise<string> {
    const response = await this.openai.createCompletion({
      ...config,
      model: "text-davinci-003",
      prompt,
    });

    return response.data.choices[0].text || "";
  }
}
