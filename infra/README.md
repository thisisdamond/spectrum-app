# Infrastructure

Local development uses PostgreSQL from the root Docker Compose file.

The proposed production baseline is AWS RDS PostgreSQL, private S3 media storage, ECS/Fargate for the API, Secrets Manager, CloudWatch/OpenTelemetry, WAF, and isolated VPC networking. Infrastructure-as-code will be added after the API contract and traffic model stabilize; no production deployment should use the local credentials in this repository.
