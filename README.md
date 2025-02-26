
grok_API 接入指南

## 构建
```bash
docker-compose up --build
```
## Test APi
>>>>>>> 6542742 (feat: init)
```
curl --location 'http://localhost:4000/v1/chat/completions' \
--header 'Content-Type: application/json' \
--header 'Authorization: sk-123456' \
--data '{"model":"grok-3","messages":[{"content": "实现一个快排"}]}'
```
