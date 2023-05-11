import { ICompiledInferenceRequest } from "./promptRunner";

export interface IInferenceLoggerConstructor {
  new (appName: string): IInferenceLogger;
}
export abstract class IInferenceLogger {
  public inferenceId: string;

  constructor(public appName: string) {
    this.inferenceId = `${appName}-${Date.now()}`;
  }

  abstract inferenceStarted(
    inferenceRequest: ICompiledInferenceRequest<any, any>,
    mergeData: any,
    retryCount: number
  ): void;
  abstract inferenceCompleted(
    inferenceRequest: ICompiledInferenceRequest<any, any>,
    mergeData: any,
    retryCount: number,
    result: string
  ): void;
  abstract validationCompleted(
    inferenceRequest: ICompiledInferenceRequest<any, any>,
    mergeData: any,
    retryCount: number,
    result: boolean
  ): void;
}

export class ConsoleInferenceLogger extends IInferenceLogger {
  inferenceStarted(
    inferenceRequest: ICompiledInferenceRequest<any, any>,
    mergeData: any,
    retryCount: number
  ): void {
    console.log(
      `[AppName=${this.appName}] [AppInferenceId=${this.inferenceId}] [InferenceId=${inferenceRequest.inferenceId}]`,
      retryCount === 0
        ? `Inference started for [${inferenceRequest.friendlyName}]`
        : `Retrying inference for [${
            inferenceRequest.friendlyName
          }] [MergeData=${JSON.stringify(mergeData)}]`,
      `Raw Prompt: ${inferenceRequest.rawPrompt}`
    );
  }
  inferenceCompleted(
    inferenceRequest: ICompiledInferenceRequest<any, any>,
    mergeData: any,
    retryCount: number,
    result: string
  ): void {
    console.log(
      `[AppName=${this.appName}] [AppInferenceId=${this.inferenceId}] [InferenceId=${inferenceRequest.inferenceId}]`,
      `Inference completed for [${inferenceRequest.friendlyName}] [Retries=${retryCount}] [Result=${result}]`
    );
  }

  validationCompleted(
    inferenceRequest: ICompiledInferenceRequest<any, any>,
    mergeData: any,
    retryCount: number,
    result: boolean
  ): void {
    console.log(
      `[AppName=${this.appName}] [AppInferenceId=${this.inferenceId}] [InferenceId=${inferenceRequest.inferenceId}]`,
      `Validation ${result ? "succeeded" : "failed"} for [${
        inferenceRequest.friendlyName
      }] [Retries=${retryCount}] [Result=${result}] [Validation=${JSON.stringify(
        inferenceRequest.validation
      )}]`
    );
  }
}
