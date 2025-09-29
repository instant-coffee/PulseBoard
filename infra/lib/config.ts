export type EnvName = "dev" | "stage" | "prod";

export interface StackConfig {
  readonly envName: EnvName;
  readonly region: string;
  readonly account: string;
}

export const resolveConfig = (app?: import('aws-cdk-lib').App): StackConfig => {
  const envName = (process.env.APP_ENV ?? 'dev') as EnvName;
  // pull from env, then CDK context (-c account=..., -c region=...)
  const account =
    process.env.CDK_DEFAULT_ACCOUNT ||
    app?.node.tryGetContext('account') ||
    '';

  const region =
    process.env.CDK_DEFAULT_REGION ||
    app?.node.tryGetContext('region') ||
    process.env.AWS_REGION ||
    'ca-central-1';

  return { envName, account, region };
};
