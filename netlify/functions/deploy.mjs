const GITHUB_API = 'https://api.github.com';

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

/** Reads the relay configuration from Netlify environment variables. */
function readConfig() {
  const repo = String(process.env.GITHUB_RELAY_REPO || '').trim();
  const token = String(process.env.GITHUB_RELAY_TOKEN || '').trim();
  const workflow = String(process.env.GITHUB_RELAY_WORKFLOW || 'deploy-relay.yml').trim();
  const base = String(process.env.GITHUB_RELAY_BRANCH || 'main').trim();
  const accessCode = String(process.env.DEPLOY_ACCESS_CODE || '').trim();

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    return {
      ok: false,
      reason:
        'Set GITHUB_RELAY_REPO (owner/repo) in Netlify → Site configuration → Environment variables.',
    };
  }
  if (token.length < 20) {
    return {
      ok: false,
      reason: 'Set GITHUB_RELAY_TOKEN to a fine-grained GitHub token with Contents + Actions read/write.',
    };
  }
  if (!/^[A-Za-z0-9_.-]+$/.test(workflow)) {
    return { ok: false, reason: 'GITHUB_RELAY_WORKFLOW must be a workflow file name.' };
  }
  return { ok: true, repo, token, workflow, base, accessCode };
}

async function github(config, path, init = {}) {
  const response = await fetch(GITHUB_API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'appcraft-studio-relay',
      ...(init.headers || {}),
    },
  });

  if (response.status === 204) return { response, data: null };
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text.slice(0, 300) };
    }
  }
  return { response, data };
}

function githubError(result, fallback) {
  if (result?.data?.message) return `${fallback}: ${result.data.message}`;
  return `${fallback} (HTTP ${result?.response?.status || 'network error'})`;
}

async function validateRelay(config) {
  const repoResult = await github(config, `/repos/${config.repo}`);
  if (!repoResult.response.ok) {
    return {
      ok: false,
      reason: githubError(repoResult, 'Cannot read the relay repository'),
    };
  }
  const workflowResult = await github(
    config,
    `/repos/${config.repo}/contents/.github/workflows/${encodeURIComponent(config.workflow)}?ref=${encodeURIComponent(config.base)}`
  );
  if (!workflowResult.response.ok) {
    return {
      ok: false,
      reason: `Add .github/workflows/${config.workflow} to the relay repository (download it from the Deploy tab).`,
    };
  }
  return { ok: true };
}

function safeId(value) {
  return typeof value === 'string' && /^[a-z0-9-]{4,64}$/i.test(value);
}

async function status(request, config) {
  const probe = await validateRelay(config);
  if (!probe.ok) {
    return json(200, {
      configured: false,
      repo: config.repo,
      workflow: config.workflow,
      reason: probe.reason,
    });
  }
  return json(200, {
    configured: true,
    repo: config.repo,
    workflow: config.workflow,
  });
}

async function start(request, config) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: 'The deploy request is not valid JSON.' });
  }

  if (config.accessCode && String(payload.accessCode || '') !== config.accessCode) {
    return json(403, { error: 'Deploy access code is not correct.' });
  }

  const zip = typeof payload.zip === 'string' ? payload.zip : '';
  if (!zip || !/^[A-Za-z0-9+/=]+$/.test(zip)) {
    return json(400, { error: 'Missing project archive.' });
  }
  if (zip.length > 5_600_000) {
    return json(413, { error: 'Project archive is larger than the 4 MB limit.' });
  }
  if (zip.length < 500) {
    return json(400, { error: 'Project archive looks empty.' });
  }

  const slug = String(payload.slug || 'app')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'app';
  const version = String(payload.version || '1.0.0')
    .replace(/[^0-9A-Za-z._-]/g, '')
    .slice(0, 40) || '1.0.0';
  const appName = String(payload.appName || slug).slice(0, 80);

  const deployId = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const branch = `appcraft/build-${deployId}`;

  const baseRef = await github(
    config,
    `/repos/${config.repo}/git/ref/heads/${encodeURIComponent(config.base)}`
  );
  if (!baseRef.response.ok || !baseRef.data?.object?.sha) {
    return json(502, {
      error: githubError(baseRef, `Cannot read branch ${config.base} in the relay repository`),
    });
  }

  const createBranch = await github(config, `/repos/${config.repo}/git/refs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ref: `refs/heads/${branch}`,
      sha: baseRef.data.object.sha,
    }),
  });
  if (!createBranch.response.ok) {
    return json(502, { error: githubError(createBranch, 'Cannot create the build branch') });
  }

  const upload = await github(config, `/repos/${config.repo}/contents/inbox/app.zip`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message: `AppCraft build ${deployId}`,
      content: zip,
      branch,
    }),
  });
  if (!upload.response.ok) {
    await github(config, `/repos/${config.repo}/git/refs/heads/${branch}`, {
      method: 'DELETE',
    }).catch(() => null);
    return json(502, { error: githubError(upload, 'Cannot upload the project archive') });
  }

  const dispatch = await github(
    config,
    `/repos/${config.repo}/actions/workflows/${encodeURIComponent(config.workflow)}/dispatches`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ref: branch,
        inputs: {
          deploy_id: deployId,
          slug,
          version,
          app_name: appName,
        },
      }),
    }
  );
  if (!dispatch.response.ok) {
    await github(config, `/repos/${config.repo}/git/refs/heads/${branch}`, {
      method: 'DELETE',
    }).catch(() => null);
    return json(502, { error: githubError(dispatch, 'Cannot start the build workflow') });
  }

  return json(201, {
    deployId,
    branch,
    runUrl: `https://github.com/${config.repo}/actions/workflows/${config.workflow}`,
    releaseUrl: `https://github.com/${config.repo}/releases/tag/appcraft-${deployId}`,
  });
}

async function poll(config, deployId) {
  if (!safeId(deployId)) {
    return json(400, { error: 'Invalid build id.' });
  }

  const releaseResult = await github(
    config,
    `/repos/${config.repo}/releases/tags/appcraft-${encodeURIComponent(deployId)}`
  );
  if (releaseResult.response.ok && releaseResult.data) {
    const assets = Array.isArray(releaseResult.data.assets) ? releaseResult.data.assets : [];
    const apk = assets.find((asset) => String(asset.name || '').endsWith('.apk'));
    const aab = assets.find((asset) => String(asset.name || '').endsWith('.aab'));
    return json(200, {
      state: 'ready',
      deployId,
      releaseUrl: releaseResult.data.html_url,
      apkUrl: apk?.browser_download_url,
      aabUrl: aab?.browser_download_url,
    });
  }

  const runsResult = await github(
    config,
    `/repos/${config.repo}/actions/runs?branch=${encodeURIComponent(`appcraft/build-${deployId}`)}&per_page=5`
  );
  if (!runsResult.response.ok) {
    return json(502, { error: githubError(runsResult, 'Cannot read the build status') });
  }

  let run = Array.isArray(runsResult.data?.workflow_runs)
    ? runsResult.data.workflow_runs[0]
    : null;

  // The workflow deletes its own branch as its last step, so fall back to the
  // delivery title when GitHub no longer matches the branch filter.
  if (!run) {
    const recent = await github(config, `/repos/${config.repo}/actions/runs?per_page=30`);
    if (recent.response.ok && Array.isArray(recent.data?.workflow_runs)) {
      run =
        recent.data.workflow_runs.find(
          (candidate) =>
            String(candidate.head_branch || '') === `appcraft/build-${deployId}` ||
            String(candidate.display_title || '').includes(deployId)
        ) || null;
    }
  }
  if (!run) {
    return json(200, {
      state: 'queued',
      deployId,
      message: 'Build queued. GitHub is preparing the runner…',
    });
  }

  const logsUrl = run.html_url;
  if (run.status === 'completed') {
    if (run.conclusion === 'success') {
      // The release can lag a few seconds behind the run finishing.
      return json(200, {
        state: 'building',
        deployId,
        runUrl: logsUrl,
        logsUrl,
        message: 'Build finished; publishing the release…',
      });
    }
    return json(200, {
      state: 'failed',
      deployId,
      runUrl: logsUrl,
      logsUrl,
      message: `Build ${run.conclusion || 'failed'}. Open the log for the exact Gradle error.`,
    });
  }
  if (run.status === 'in_progress') {
    return json(200, {
      state: 'building',
      deployId,
      runUrl: logsUrl,
      logsUrl,
      message: 'Gradle is building the APK and AAB…',
    });
  }
  return json(200, {
    state: 'queued',
    deployId,
    runUrl: logsUrl,
    logsUrl,
    message: 'Waiting for a GitHub runner…',
  });
}

export default async (request) => {
  const config = readConfig();
  if (!config.ok) {
    return json(200, { configured: false, reason: config.reason });
  }

  try {
    if (request.method === 'GET') {
      const deployId = new URL(request.url).searchParams.get('deploy');
      if (deployId) return await poll(config, deployId);
      return await status(request, config);
    }
    if (request.method === 'POST') {
      return await start(request, config);
    }
    return json(405, { error: 'Use GET for status or POST to deploy.' });
  } catch (error) {
    console.error('AppCraft deploy error:', error);
    return json(500, {
      error: 'The deploy service hit an unexpected error. Check the Netlify function log.',
    });
  }
};
