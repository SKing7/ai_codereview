import https from 'https';
import { TOKEN } from './env'
import axios from 'axios';

const GITLAB_URL: string = 'https://git.yuaiweiwu.com';
const PROJECT_ID: string = '165';
const MR_IID: string = '8';

const url: string = `${GITLAB_URL}/api/v4/projects/${PROJECT_ID}/merge_requests/${MR_IID}/changes`;

const options: https.RequestOptions = {
  headers: {
    'PRIVATE-TOKEN': TOKEN
  }
};
interface Diff {
  old_path: string;
  new_path: string;
  diff: string;
}

interface CommentBody {
  body: string;
  position: {
    base_sha: string;
    start_sha: string;
    head_sha: string;
    position_type: 'text';
    new_path: string;
    new_line: number;
  };
}


export function start(): Promise<Diff[]> {
  return new Promise((resolve, reject) => {
    https.get(url, options, (response) => {
      let data: string = '';

      // Collect response data
      response.on('data', (chunk: string | Buffer) => {
        data += chunk;
      });

      // Handle response completion
      response.on('end', () => {
        if (response.statusCode === 200) {
          const obj = JSON.parse(data);
          const diffRefs = obj.diff_refs;
          const changes: Diff[] = obj.changes;
          const tsChanges = changes.filter((change: any) => {
            return change.new_path.endsWith('.ts');
          });
          const diff = tsChanges.map((change) => {
            return {
              old_path: change.old_path,
              new_path: change.new_path,
              diff: change.diff
            };
          });
          processMergeRequest(diffRefs, diff);
          resolve(diff)
        } else {
          console.log('获取失败，状态码:', response.statusCode);
          console.log('请检查参数或网络');
        }
      });

    }).on('error', (err: Error) => {
      reject(err);
      console.error('请求失败:', err.message);
      console.log('请检查参数或网络');
    });
  });
}


// Main function to process MR and add comments
async function processMergeRequest(refs, diffs: Diff[]): Promise<void> {
  let index = 1;
  try {
    for (const diff of diffs) {
      const comment: CommentBody = {
        body: '', // Comment body; adjust as needed
        position: {
          base_sha: refs.base_sha,  // Need MR version info
          start_sha: refs.start_sha, // Need MR version info
          head_sha: refs.head_sha,  // Need MR version info
          position_type: 'text',
          new_path: diff.new_path,
          new_line: 10    // Comment on first line; adjust as needed
        }
      };


      if (index === 1) {
        getAISuggestions(diff.diff).then((text) => {
          comment.body = text;
          postComment(comment);
          console.log('AI Result', text);
          console.log('所有评论已成功添加');
        });
        index++;
      }
    }

  } catch (error) {
    console.error('处理失败:', error instanceof Error ? error.message : error);
  }
}

async function getAISuggestions(code) {

  // 配置请求
  const config = {
    method: 'post',
    url: 'http://localhost:4000/v1/chat/completions',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'sk-123456'
    },
    data: {
      "model": "grok-3",
      "messages": [{
        "content": `
        你是一个经验丰富的前端开发专家，擅长代码审查。我将提供一段前端代码（可能是 JavaScript、TypeScript、React、Vue 或其他常见技术栈），请你帮我审查代码，重点关注以下几个方面：

        1. **团队协作规范**：
          - 代码是否遵循一致的命名规范（如 camelCase、PascalCase）？
          - 是否有清晰的模块化结构，便于多人协作？
          - 是否有足够的注释，方便团队成员理解代码意图？
        2. **可读性**：
          - 代码是否简洁易懂，避免过于复杂的逻辑嵌套？
          - 是否使用了有意义的变量名和函数名？
          - 是否遵循了 DRY（不要重复自己）原则？
        3 **可维护性**
          - 代码是否易于维护和扩展？
          - 是否有适当的错误处理和边界检查？
          - 是否遵循了 SOLID 原则（单一职责、开放封闭、里氏替换、接口隔离、依赖反转）？
        4. **安全性**：
          - 是否有潜在的 XSS（跨站脚本攻击）风险，例如未转义的用户输入？
          - 是否正确处理了敏感数据（如 API 密钥、用户隐私信息）？
          - 是否有适当的错误处理，避免泄露内部信息？
        5. **错误处理与健壮性**：
          - 是否处理了网络请求失败的情况？
          - 是否有边界情况的检查（如空数组、null 值）？
          - 是否提供了用户友好的错误提示？

        请以自然、专业的语气提供反馈，具体指出问题并给出改进建议。
        如果代码中有明显的优点，也请指出。以下是我的代码：

        ${code}

        请基于上述要求进行审查，请反馈出最重要的几个问题（最好不超过3个点），不需要针对以上规则一一分析。
        另外用中文回复，并且不需要回复修改后的代码
      `,
      }]
    }
  };

  console.log('Ai Request', config);

  // 发送请求
  return axios(config)
    .then(response => {
      return response.data.choices[0].message.content;
    })
    .catch(error => {
      console.error('请求失败:', error.message);
      if (error.response) {
        console.error('响应状态:', error.response.status);
        console.error('响应数据:', error.response.data);
      }
    });
}

function postComment(comment: CommentBody): Promise<void> {
  return new Promise((resolve, reject) => {
    const url: string = `${GITLAB_URL}/api/v4/projects/${PROJECT_ID}/merge_requests/${MR_IID}/notes`;
    const options: https.RequestOptions = {
      method: 'POST',
      headers: {
        'PRIVATE-TOKEN': TOKEN,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (response) => {
      if (response.statusCode === 201) {
        console.log(`评论成功添加至: ${comment.position.new_path}`);
        resolve();
      } else {
        reject(new Error(`评论添加失败，状态码: ${response.statusCode}`));
      }
    });

    req.on('error', reject);
    req.write(JSON.stringify(comment));
    req.end();
  });
}

start();
