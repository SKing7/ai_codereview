基于 grok_API 实现对 Merge Request 进行 Code Review

## 构建

```bash
docker-compose up --build
```

## Test Grok APi

```
curl --location 'http://localhost:4000/v1/chat/completions' \
--header 'Content-Type: application/json' \
--header 'Authorization: sk-123456' \
--data '{"model":"grok-3","messages":[{"content": "实现一个快排"}]}'
```

# AI Code Review

```
npx tsx cr.ts
```
