import "./style.css";

export const VERSION: string = "0.1.0";

export interface TaarikhPickerOptions {
  readonly locale?: string | undefined;
}

export class TaarikhPicker {
  public readonly version: string = VERSION;
  private readonly options: TaarikhPickerOptions;

  public constructor(options?: TaarikhPickerOptions) {
    this.options = options ?? {};
  }

  public getOptions(): TaarikhPickerOptions {
    return this.options;
  }

  public destroy(): void {
    // Teardown placeholder
  }
}
