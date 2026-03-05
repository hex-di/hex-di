# Huly — Deployment

**Source:** https://github.com/hcengineering/platform/tree/main/dev/docker-compose, https://huly.io/docs/self-hosting
**Captured:** 2026-02-28

---

## Self-Hosting Overview

Huly is designed for self-hosting via Docker Compose. The deployment includes 10+ services and 6+ infrastructure dependencies.

---

## System Requirements

| Resource       | Minimum               | Recommended           |
| -------------- | --------------------- | --------------------- |
| CPU            | 4 cores               | 8+ cores              |
| RAM            | 8 GB                  | 16+ GB                |
| Disk           | 50 GB SSD             | 200+ GB SSD           |
| OS             | Linux (Ubuntu 22.04+) | Linux (Ubuntu 22.04+) |
| Docker         | 24.0+                 | Latest stable         |
| Docker Compose | v2.20+                | Latest stable         |

---

## Infrastructure Dependencies

| Service           | Purpose                                     | Default Port | Image                   |
| ----------------- | ------------------------------------------- | ------------ | ----------------------- |
| **CockroachDB**   | Primary database (PostgreSQL wire protocol) | 26257        | `cockroachdb/cockroach` |
| **Elasticsearch** | Full-text search, indexing                  | 9200         | `elasticsearch:7.17`    |
| **MinIO**         | Object/blob storage (S3-compatible)         | 9000, 9001   | `minio/minio`           |
| **Redpanda**      | Event streaming (Kafka-compatible)          | 9092         | `redpandadata/redpanda` |
| **Redis**         | Cache, pub-sub, sessions                    | 6379         | `redis:7`               |
| **Rekoni**        | Image processing, thumbnails                | 4004         | `hardcoreeng/rekoni`    |

---

## Service Port Mapping

### Huly Services

| Service          | Port | Protocol  | Description                          |
| ---------------- | ---- | --------- | ------------------------------------ |
| **Front**        | 8080 | HTTP      | Static assets, reverse proxy         |
| **Transactor**   | 3333 | WebSocket | Client connections, transactions     |
| **Collaborator** | 3078 | WebSocket | Real-time document editing           |
| **Account**      | 3000 | HTTP/REST | Authentication, workspace management |
| **AI Bot**       | 4005 | HTTP      | LLM integration                      |
| **Print**        | 4006 | HTTP      | PDF generation                       |
| **Sign**         | 4007 | HTTP      | Digital signatures                   |
| **Analytics**    | 4008 | HTTP      | Usage analytics                      |
| **Backup**       | 4009 | HTTP      | Backup/restore                       |

### Infrastructure Ports

| Service       | Client Port | Admin Port |
| ------------- | ----------- | ---------- |
| CockroachDB   | 26257       | 8081       |
| Elasticsearch | 9200        | —          |
| MinIO         | 9000        | 9001       |
| Redpanda      | 9092        | 8082       |
| Redis         | 6379        | —          |

---

## Docker Compose Structure

```yaml
# Simplified docker-compose.yml structure
services:
  # Infrastructure
  cockroachdb:
    image: cockroachdb/cockroach:v23.x
    volumes:
      - cockroach-data:/cockroach/cockroach-data
    ports:
      - "26257:26257"

  elasticsearch:
    image: elasticsearch:7.17.x
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - elastic-data:/usr/share/elasticsearch/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    volumes:
      - minio-data:/data

  redpanda:
    image: redpandadata/redpanda
    command: redpanda start --mode dev-container
    volumes:
      - redpanda-data:/var/lib/redpanda/data

  redis:
    image: redis:7-alpine

  # Huly Services
  account:
    image: hardcoreeng/account
    depends_on:
      - cockroachdb
      - redis
    environment:
      - DB_URL=postgresql://...
      - SECRET=...

  transactor:
    image: hardcoreeng/transactor
    depends_on:
      - cockroachdb
      - elasticsearch
      - minio
      - redpanda
      - redis
    environment:
      - DB_URL=postgresql://...
      - ELASTIC_URL=http://elasticsearch:9200
      - MINIO_ENDPOINT=minio
      - REDIS_URL=redis://redis:6379

  collaborator:
    image: hardcoreeng/collaborator
    depends_on:
      - transactor
      - minio

  front:
    image: hardcoreeng/front
    ports:
      - "8080:8080"
    depends_on:
      - transactor
      - account

volumes:
  cockroach-data:
  elastic-data:
  minio-data:
  redpanda-data:
```

---

## Environment Variables

### Required

| Variable           | Service                  | Description                                       |
| ------------------ | ------------------------ | ------------------------------------------------- |
| `SECRET`           | All                      | JWT signing secret (must be same across services) |
| `DB_URL`           | Transactor, Account      | CockroachDB connection string                     |
| `ELASTIC_URL`      | Transactor               | Elasticsearch endpoint                            |
| `MINIO_ENDPOINT`   | Transactor, Collaborator | MinIO hostname                                    |
| `MINIO_ACCESS_KEY` | Transactor, Collaborator | MinIO access key                                  |
| `MINIO_SECRET_KEY` | Transactor, Collaborator | MinIO secret key                                  |
| `REDIS_URL`        | All                      | Redis connection string                           |
| `ACCOUNTS_URL`     | Front, Transactor        | Account service URL                               |
| `UPLOAD_URL`       | Front                    | File upload endpoint                              |

### Optional Features

| Variable             | Service      | Feature                      |
| -------------------- | ------------ | ---------------------------- |
| `LIVEKIT_HOST`       | Love         | Video conferencing (LiveKit) |
| `LIVEKIT_API_KEY`    | Love         | LiveKit API key              |
| `LIVEKIT_API_SECRET` | Love         | LiveKit API secret           |
| `SMTP_HOST`          | Notification | Email notifications          |
| `SMTP_PORT`          | Notification | SMTP port                    |
| `SMTP_USER`          | Notification | SMTP username                |
| `SMTP_PASS`          | Notification | SMTP password                |
| `VAPID_PUBLIC_KEY`   | Front        | Web Push notifications       |
| `VAPID_PRIVATE_KEY`  | Notification | Web Push signing             |
| `TELEGRAM_BOT_TOKEN` | Telegram     | Telegram integration         |
| `OPENAI_API_KEY`     | AI Bot       | OpenAI integration           |

---

## Volume Management

| Volume           | Service       | Contains                         | Backup Priority |
| ---------------- | ------------- | -------------------------------- | --------------- |
| `cockroach-data` | CockroachDB   | All workspace data, accounts     | Critical        |
| `elastic-data`   | Elasticsearch | Search indices                   | Rebuildable     |
| `minio-data`     | MinIO         | File uploads, documents, avatars | Critical        |
| `redpanda-data`  | Redpanda      | Event streams, topics            | Rebuildable     |

### Backup Strategy

```
Critical (must backup):
  ├── CockroachDB → pg_dump or CockroachDB backup
  └── MinIO → mc mirror or S3-compatible backup

Rebuildable (can regenerate):
  ├── Elasticsearch → Re-index from CockroachDB
  └── Redpanda → Replay from transactor
```

---

## Optional Services

| Service          | Purpose                      | Required             |
| ---------------- | ---------------------------- | -------------------- |
| **LiveKit**      | Video/voice conferencing     | No                   |
| **Telegram Bot** | Telegram message integration | No                   |
| **Gmail**        | Email integration            | No                   |
| **SMTP**         | Email notification delivery  | No (but recommended) |
| **AI Bot**       | AI-powered features          | No                   |
| **Print**        | PDF document export          | No                   |
| **Sign**         | Digital signatures           | No                   |

---

## Networking

### Recommended Reverse Proxy Setup

```
Internet
   │
   ▼
┌──────────────────┐
│  Reverse Proxy    │
│  (Nginx/Caddy)   │
│                   │
│  /        → Front │  (8080)
│  /api     → Account│ (3000)
│  /ws      → Transactor│ (3333) [WebSocket upgrade]
│  /collab  → Collaborator│ (3078) [WebSocket upgrade]
│  /love    → Love   │  (8096) [WebSocket upgrade]
└──────────────────┘
```

### TLS Requirements

- All production deployments should use TLS (HTTPS/WSS)
- Let's Encrypt with Caddy is the recommended approach for automated TLS
- WebSocket connections require proper `Upgrade` header forwarding

---

## SpecForge Relevance

| Huly Concept                                      | SpecForge Parallel                                          |
| ------------------------------------------------- | ----------------------------------------------------------- |
| Docker Compose service topology                   | SpecForge's adapter graph — services declare dependencies   |
| Infrastructure dependencies (DB, cache, search)   | SpecForge's port definitions for persistence, cache, search |
| Environment variable configuration                | SpecForge's adapter configuration via graph builder         |
| Volume management (critical vs rebuildable)       | SpecForge's port categorization (essential vs derived data) |
| Service-to-service authentication (shared secret) | SpecForge's internal adapter trust model                    |
| Optional services (enable/disable)                | SpecForge's conditional adapter registration                |
