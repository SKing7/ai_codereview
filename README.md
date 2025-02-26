基于 grok_API 实现对 Merge Request 进行 Code Review

## Install

```shell
brew install git-crypt gpg
git-crypt status

# 查看是否已经加密

git commit -m "Encrypt app/env.ts and docker-compose.yml"
git push
```

## 密钥使用
```
git-crypt export-key keyfile
git-crypt lock
git-crypt unlock keyfile
```
## 构建

```bash
docker build --no-cache -t grok/api .

docker-compose up
```

# AI Code Review

```shell
npx tsx app/code_review.ts
```

## Test Grok APi

```
curl --location 'http://localhost:4000/v1/chat/completions' \
--header 'Content-Type: application/json' \
--header 'Authorization: sk-123456' \
--data '{"model":"grok-3","messages":[{"content": "实现一个快排"}]}'
```

