export interface IInferenceValidation<TMergeData extends Record<string, any>> {
  enum?: string[];
  type?: "json" | "string" | "number" | "boolean";
  validate?: (result: string, mergeData: TMergeData) => Promise<boolean>;
}

export interface IInferenceRetryConfig<TMergeData extends Record<string, any>> {
  max: number;
  fn?: (result: string, mergeData: TMergeData) => Promise<boolean>;
}

export interface IInferenceRequest<
  TMergeData extends Record<string, any>,
  TPromptFormat = string // e.g. Chat optimized or text completion
> {
  prompt(mergeData: TMergeData): Promise<TPromptFormat>;
  inferenceConfig?: IModelInferenceConfig;
  validation?: IInferenceValidation<TMergeData>;
  retry?: IInferenceRetryConfig<TMergeData>;
}

export interface IModelInferenceConfig {
  temperature: number;
}
const DEFAULT_INFERENCE_CONFIG = {
  temperature: 0.7,
};

export interface IModelProvider<TPromptFormat> {
  infer(config: IModelInferenceConfig, prompt: TPromptFormat): Promise<string>;
}

export async function infer<
  TMergeData extends Record<string, any>,
  TPromptFormat
>(
  modelProvider: IModelProvider<TPromptFormat>,
  {
    prompt,
    inferenceConfig,
    validation,
    retry,
  }: IInferenceRequest<TMergeData, TPromptFormat>,
  mergeData: TMergeData,
  retriesCount = 0
): Promise<string> {
  const finalPrompt = await prompt(mergeData);
  const inferenceResult = await modelProvider.infer(
    inferenceConfig || DEFAULT_INFERENCE_CONFIG,
    finalPrompt
  );

  const treatedResult = inferenceResult.trim();

  const validationResult = validation
    ? await validateInferenceResult(treatedResult, validation, mergeData)
    : true;
  // TODO: Log validation result

  if (validationResult) {
    return treatedResult;
  } else {
    console.info(`Validation Failed: [${treatedResult}]`, validation);
    if (retry && retriesCount < retry.max) {
      let shouldRetry = retry.fn ? retry.fn(treatedResult, mergeData) : true;
      if (shouldRetry) {
        // TODO: Log retry
        console.info(`Retrying [${retriesCount + 1}]`);
        return infer(
          modelProvider,
          { prompt, inferenceConfig, validation, retry },
          mergeData,
          retriesCount + 1
        );
      }
    }
  }

  throw new Error("Failed to validate inference result");
}

export async function validateInferenceResult<
  TMergeData extends Record<string, any>
>(
  inferenceResult: string,
  validation: IInferenceValidation<TMergeData>,
  mergeData: TMergeData
): Promise<boolean> {
  if (validation.enum) {
    return validation.enum.includes(inferenceResult);
  }
  if (validation.type) {
    if (validation.type === "number" && isNaN(Number(inferenceResult)))
      return false;
    if (
      validation.type === "boolean" &&
      !(
        inferenceResult === "true" ||
        inferenceResult === "false" ||
        inferenceResult === "True" ||
        inferenceResult === "False"
      )
    )
      return false;
    if (validation.type === "json") {
      try {
        JSON.parse(inferenceResult);
      } catch (err) {
        return false;
      }
    }
    if (validation.validate) {
      return validation.validate(inferenceResult, mergeData);
    }
  }
  return true;
}
