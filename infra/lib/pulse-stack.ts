import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

export class PulseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'InfraQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    // START STACK CODE

    // 1) Private S3 bucket for static assets
    // Why private? We serve through CloudFront (CDN) for performance & HTTPS.
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      // Block direct public access; CloudFront will read via an identity.
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true, // cheap rollback; helpful in CI/CD
      removalPolicy: RemovalPolicy.DESTROY, // keep RETAIN for prod
      autoDeleteObjects: true,             // dev convenience only
    });

    // // 2) Origin Access Control (OAC) - modern replacement for OAI
    // // Why OAC? Better security and performance than OAI.
    // const oac = new cloudfront.OriginAccessControl(this, 'OAC', {
    //   originAccessControlConfig: {
    //     name: 'PulseBoardOAC',
    //     description: 'OAC for PulseBoard S3 bucket',
    //     originAccessControlOriginType: 's3',
    //     signingBehavior: 'always',
    //     signingProtocol: 'sigv4'
    //   }
    // });

    // 3) Security headers (basic hardened defaults)
    const securityHeaders = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          // VERY permissive default for SPAs; tighten later as you know your domains.
          contentSecurityPolicy:
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:",
          override: true
        },
        strictTransportSecurity: {
          accessControlMaxAge: Duration.days(365),
          includeSubdomains: true,
          preload: true,
          override: true
        },
        xssProtection: { protection: true, modeBlock: true, override: true },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.NO_REFERRER_WHEN_DOWNGRADE,
          override: true
        }
      }
    });

    // 4) CloudFront distribution in front of S3
    // Why CloudFront? Global edge caching, TLS, compression, signed URLs (later), etc.
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(siteBucket);

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: securityHeaders,
        compress: true,
      },
      defaultRootObject: 'index.html',
      comment: 'Pulseboard web distribution',
    });

    // 5) Optional: Deploy a placeholder index.html so you immediately see something
    new s3deploy.BucketDeployment(this, 'DeployPlaceholder', {
      sources: [s3deploy.Source.data('index.html', `
        <!doctype html>
        <html lang="en">
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Pulseboard</title>
          <h1 style="font-family: system-ui; margin-top: 20vh; text-align:center">
            🚀 Pulseboard is live behind CloudFront
          </h1>
        </html>
              `)],
      destinationBucket: siteBucket,
      distribution, // invalidates cache after upload
      prune: false
    });

    // 6) Outputs: make it easy to grab the URL in CI and locally
    new CfnOutput(this, 'WebUrl', {
      value: `https://${distribution.domainName}`,
      description: 'CloudFront URL of the site'
    });
    new CfnOutput(this, 'BucketName', {
      value: siteBucket.bucketName,
      description: 'S3 bucket for static assets'
    });
    // END STACK CODE
  }
}
