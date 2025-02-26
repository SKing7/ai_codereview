import https from 'https';
import fs from 'fs';

// Configuration parameters
const GITLAB_URL: string = 'https://git.yuaiweiwu.com';  // Replace with your GitLab domain
const PROJECT_ID: string = '165';                        // Replace with your project ID
const MR_IID: string = '8';                             // Replace with your Merge Request IID

// Construct the API URL
const url: string = `${GITLAB_URL}/api/v4/projects/${PROJECT_ID}/merge_requests/${MR_IID}/changes`;

// HTTP request options
const options: https.RequestOptions = {
  headers: {
    'PRIVATE-TOKEN': TOKEN
  }
};
// Interfaces for GitLab diff structure
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
  try {
    for (const diff of diffs) {
      const comment: CommentBody = {
        body: diff.diff.substring(0, 10), // Comment body; adjust as needed
        position: {
          base_sha: refs.base_sha,  // Need MR version info
          start_sha: refs.start_sha, // Need MR version info
          head_sha: refs.head_sha,  // Need MR version info
          position_type: 'text',
          new_path: diff.new_path,
          new_line: 10    // Comment on first line; adjust as needed
        }
      };

      await postComment(comment);
    }

    console.log('所有评论已成功添加');
  } catch (error) {
    console.error('处理失败:', error instanceof Error ? error.message : error);
  }
}

// Post comment to MR
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
