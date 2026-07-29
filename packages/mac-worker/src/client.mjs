export function createControlPlaneClient({
  baseUrl,
  token,
  fetchImpl = fetch,
}) {
  const root = String(baseUrl || "").replace(/\/$/, "");
  if (!root) throw new Error("CONTROL_PLANE_URL required");

  const headers = {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };

  async function request(method, path, body) {
    const res = await fetchImpl(`${root}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
    }
    return data;
  }

  return {
    heartbeat(payload) {
      return request("POST", "/v1/workers/heartbeat", payload);
    },
    claim(workerId) {
      return request(
        "POST",
        `/v1/workers/${encodeURIComponent(workerId)}/claim`,
        {}
      );
    },
    postResult(jobId, result) {
      return request("POST", `/v1/jobs/${encodeURIComponent(jobId)}/result`, result);
    },
    healthz() {
      return request("GET", "/healthz");
    },
  };
}
