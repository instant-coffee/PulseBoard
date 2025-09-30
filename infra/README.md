# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

### TODO

#### After building the frontend:

aws s3 sync ../frontend/dist s3://$(aws cloudformation describe-stacks \
  --stack-name PulseStack \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text --profile dev) --delete

//(Invalidate CF to pick up new files)
aws cloudfront create-invalidation \
  --distribution-id $(aws cloudformation describe-stacks \
    --stack-name PulseStack \
    --query "Stacks[0].Outputs[?OutputKey=='WebUrl'].OutputValue" --output text --profile dev \
    | sed -E 's#https://([^/]+)/?#\1#') \
  --paths "/*" \
  --profile dev
