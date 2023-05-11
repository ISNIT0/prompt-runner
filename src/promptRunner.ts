import {
  IInferenceLogger,
  IInferenceLoggerConstructor,
} from "./logger";

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
  friendlyName: string;
  prompt(mergeData: TMergeData): Promise<TPromptFormat>;
  inferenceConfig?: IModelInferenceConfig;
  validation?: IInferenceValidation<TMergeData>;
  retry?: IInferenceRetryConfig<TMergeData>;
}

export type ICompiledInferenceRequest<
  TMergeData extends Record<string, any>,
  TPromptFormat = string
> = IInferenceRequest<TMergeData, TPromptFormat> & {
  inferenceId: string;
  rawPrompt: TPromptFormat;
};

export interface IModelInferenceConfig {
  temperature: number;
}
const DEFAULT_INFERENCE_CONFIG = {
  temperature: 0.7,
};

async function compileInferenceRequest<
  TMergeData extends Record<string, any>,
  TPromptFormat
>(
  inferenceRequest: IInferenceRequest<TMergeData, TPromptFormat>,
  mergeData: TMergeData
): Promise<ICompiledInferenceRequest<TMergeData, TPromptFormat>> {
  const rawPrompt = await inferenceRequest.prompt(mergeData);

  return {
    ...inferenceRequest,
    // TODO: better ids
    inferenceId: `ir-${inferenceRequest.friendlyName}-${Date.now()}`,
    rawPrompt,
  };
}

export interface IModelProvider<TPromptFormat> {
  infer(config: IModelInferenceConfig, prompt: TPromptFormat): Promise<string>;
}

export async function infer<
  TMergeData extends Record<string, any>,
  TPromptFormat
>(
  logger: IInferenceLogger,
  modelProvider: IModelProvider<TPromptFormat>,
  inferenceRequest: IInferenceRequest<TMergeData, TPromptFormat>,
  mergeData: TMergeData,
  retriesCount = 0
): Promise<string> {
  const { inferenceConfig, validation, retry } = inferenceRequest;

  const compiledInferenceRequest = await compileInferenceRequest(
    inferenceRequest,
    mergeData
  );

  logger.inferenceStarted(compiledInferenceRequest, mergeData, retriesCount);
  const inferenceResult = await modelProvider.infer(
    inferenceConfig || DEFAULT_INFERENCE_CONFIG,
    compiledInferenceRequest.rawPrompt
  );
  const treatedResult = inferenceResult.trim();
  logger.inferenceCompleted(
    compiledInferenceRequest,
    mergeData,
    retriesCount,
    treatedResult
  );

  const validationResult = validation
    ? await validateInferenceResult(treatedResult, validation, mergeData)
    : true;
  logger.validationCompleted(
    compiledInferenceRequest,
    mergeData,
    retriesCount,
    validationResult
  );

  if (validationResult) {
    return treatedResult;
  } else {
    console.info(
      `Validation Failed: [${treatedResult}] does not pass validation rules -`,
      validation
    );
    if (retry && retriesCount < retry.max) {
      let shouldRetry = retry.fn ? retry.fn(treatedResult, mergeData) : true;
      if (shouldRetry) {
        // TODO: Log retry
        console.info(`Retrying [${retriesCount + 1}]`);
        return infer(
          logger,
          modelProvider,
          inferenceRequest,
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

function makeAppInfer(logger: IInferenceLogger) {
  return function appInfer<
    TMergeData extends Record<string, any>,
    TPromptFormat
  >(
    modelProvider: IModelProvider<TPromptFormat>,
    inferenceRequest: IInferenceRequest<TMergeData, TPromptFormat>,
    mergeData: TMergeData,
    retriesCount = 0
  ) {
    return infer(
      logger,
      modelProvider,
      inferenceRequest,
      mergeData,
      retriesCount
    );
  };
}

type AppInfer = ReturnType<typeof makeAppInfer>;
export type ILLMApp<T> = (_infer: AppInfer) => Promise<T>;
export async function llmApp<T>(
  LoggerClass: IInferenceLoggerConstructor,
  appName: string,
  doApp: ILLMApp<T>
) {
  const logger = new LoggerClass(appName);

  const appInfer = makeAppInfer(logger);

  const result = await doApp(appInfer);

  return result;
}
