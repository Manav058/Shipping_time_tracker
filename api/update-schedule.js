export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { scheduleData } = req.body;

  const {
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO,
    GITHUB_FILE_PATH,
    GITHUB_BRANCH
  } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !GITHUB_FILE_PATH || !GITHUB_BRANCH) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  try {
    const getFileRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=${GITHUB_BRANCH}`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );

    let sha = null;
    if (getFileRes.ok) {
      const fileData = await getFileRes.json();
      sha = fileData.sha;
    }

    const content = Buffer.from(JSON.stringify(scheduleData, null, 2)).toString('base64');

    const updateRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Update shipping schedule data - ${new Date().toISOString()}`,
          content,
          branch: GITHUB_BRANCH,
          ...(sha && { sha })
        })
      }
    );

    if (!updateRes.ok) {
      const error = await updateRes.json();
      return res.status(500).json({ error: 'Failed to update GitHub file', details: error.message });
    }

    const result = await updateRes.json();
    return res.status(200).json({
      success: true,
      commit: result.commit.sha
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
