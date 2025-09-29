#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PulseStack } from '../lib/pulse-stack';
import 'source-map-support/register';
import { resolveConfig } from '../lib/config';


const app = new cdk.App();
const config = resolveConfig();

// hard-fail early with a clear message if account is missing
if (!config.account) {
  throw new Error(
    'CDK could not determine your AWS account. Run with --profile, or pass -c account=123456789012 -c region=ca-central-1'
  );
}

const env = {
  account: config.account,
  region: config.region,
};

new PulseStack(app, 'PulseStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  env,
  description: `PulseStack: static site  hosting + CDN for PulseBoard :: ENV :: ${config.envName}`,
});