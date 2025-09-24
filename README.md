# Pulse Board

## Serverless Orders & Subscriptions Analytics

A small SaaS-ish app where users can browse orders/subscriptions and see analytics (MRR, churn, cohort retention).

- Frontend (React + TypeScript) served via CloudFront + S3
- Serverless API on API Gateway + AWS Lambda (Node.js/TypeScript)
- Relational DB on Aurora RDS (Serverless v2) with strong SQL (joins, window functions)
- Data export → Snowflake (for analytics) via an ETL Lambda and a COPY INTO workflow
- CI/CD via GitHub Actions (build, test, deploy, preview envs)
- IaC with AWS CDK (TypeScript) to provision everything


## Architecture

```mermaid
flowchart LR
  %% Nodes
  client["React TS SPA"]
  cf["CloudFront"]
  s3_site["S3 static site"]

  api_gw["API Gateway"]
  lambda_fn["Lambda (Node TS)"]

  rds_proxy["RDS Proxy"]
  aurora["Aurora Serverless v2 (Postgres/MySQL)"]

  evb["EventBridge schedule"]
  etl["ETL Lambda"]
  s3_export["S3 export"]
  snowflake["Snowflake STAGE + COPY INTO tables"]

  %% Edges
  client -- "HTTPS" --> cf
  cf --> s3_site
  cf -- "/api/*" --> api_gw --> lambda_fn

  lambda_fn --> rds_proxy --> aurora

  evb --> etl --> s3_export --> snowflake

  %% Optional grouping (purely visual)
  subgraph Edge_and_Static_Content ["Edge + Static Delivery"]
    cf
    s3_site
  end

  subgraph API_Tier ["API Path"]
    api_gw
    lambda_fn
  end

  subgraph Data_Tier ["Data Tier"]
    rds_proxy
    aurora
  end

  subgraph ETL_and_Warehouse ["ETL + Warehouse"]
    evb
    etl
    s3_export
    snowflake
  end
```

### Why these choices

- Aurora Serverless v2 + RDS Proxy: stable connections for Lambda & great SQL perf.
- CDK TS: single language end-to-end; easy constructs for CloudFront/S3/API Gateway/RDS.
- Snowflake: keeps analytics concerns separate; learn external stages & COPY pipelines.
- GitHub Actions: ubiquitous, easy env matrix for dev/staging/prod.

### File Structure

```mermaid
flowchart TD
  A["pulseboard/"]

  %% frontend
  A --> B["frontend/ (React + TS, Vite)"]
  B --> B1["src/"]
  B1 --> B1a["api/ (typed fetch clients; zod-validated)"]
  B1 --> B1b["components/ (accessible, responsive UI)"]
  B1 --> B1c["pages/"]
  B1 --> B1d["types/"]
  B --> B2["index.html"]

  %% services
  A --> C["services/"]
  C --> C1["api/ (Lambda handlers)"]
  C1 --> C1a["handlers/"]
  C1 --> C1b["db/ (Kysely/Drizzle + query helpers)"]
  C1 --> C1c["types/"]
  C --> C2["etl/ (ETL Lambda -> S3 + Snowflake COPY trigger)"]

  %% infra
  A --> D["infra/ (AWS CDK, TypeScript)"]
  D --> D1["bin/"]
  D --> D2["lib/"]

  %% db
  A --> E["db/"]
  E --> E1["migrations/ (SQL migrations: Drizzle or plain SQL)"]
  E --> E2["seed/"]

  %% snowflake
  A --> F["snowflake/"]
  F --> F1["00_setup.sql (storage integration / stage / tables)"]
  F --> F2["10_copy_into.sql (COPY INTO scripts: dev/stage/prod)"]

  %% workflows
  A --> G[".github/workflows/"]
  G --> G1["ci.yml (lint / test / typecheck)"]
  G --> G2["deploy.yml (cdk synth/deploy + CloudFront invalidation)"]

  %% root
  A --> H["package.json"]
```

Milestones

- Scaffold & IaC (CDK)
  - S3 + CloudFront (OAC), API Gateway, Lambdas (Node 20), Aurora Serverless v2, Secrets Manager, RDS Proxy, VPC subnets.
  - Output useful values (API URL, CloudFront domain).

- DB & SQL

  - Migrations: users, subscriptions, orders, order_items, payments.
  - Seed script (realistic synthetic data).
  - Add window-function queries (e.g., MRR by month, churn, cohorts).

- API (Lambda)

  - Endpoints:
  - GET /api/metrics/mrr?month=YYYY-MM
  - GET /api/metrics/cohorts
  - GET /api/orders?limit=&cursor= (keyset pagination)
  - Shared response schema with zod; errors normalized.

- Frontend (React + TS)

  - Vite + TanStack Query + React Router.
  - Accessible tables & charts (Recharts).
  - Filters, responsive layout, loading/skeletons, retry UI.

- ETL → Snowflake

  - ETL Lambda runs nightly (EventBridge): query aggregates from Aurora → write CSV/Parquet to S3.
  - Snowflake: STORAGE INTEGRATION, external STAGE, raw & modeled tables, COPY INTO.

- CI/CD

  - ci.yml: pnpm install, typecheck, lint, unit tests (Vitest), basic Playwright smoke (static build).
  - deploy.yml: CDK synth/diff/deploy to env branch; invalidate CloudFront; run migrations; kick ETL dry-run.

- Perf & Hardening

  - CloudFront caching, compression; API timeouts & retries; RDS Proxy warm pool; alarms (CW Alarms) and logs.

#### Stretch Goals

- Snowpipe auto-ingest (S3 event → Snowflake pipe) and incremental models.
- Feature flags for frontend experiments.
- Observability: CW Metrics & Alarms, structured logs, error budgets.
- Edge: CloudFront Function for simple headers or AB testing variant cookie.

#### Libraries & why
- Kysely or Drizzle (DB): light, type-safe, serverless-friendly.
- TanStack Query (data fetching/caching/retries).
- Zod (runtime validation for API in/out).
- Nivo or Recharts (quick, reliable charts for dashboards).
- AWS CDK (TypeScript IaC).
