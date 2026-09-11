export async function fetchPinnedBytes(url, { expectedBytes, fetchImpl = fetch, attempts = 4, wait = () => Promise.resolve() } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url);
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (expectedBytes !== undefined && bytes.byteLength !== expectedBytes) throw Error(`size ${bytes.byteLength}, expected ${expectedBytes}`);
      return bytes;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await wait(attempt);
    }
  }
  throw Error(`Pinned download failed after ${attempts} attempts: ${url} (${lastError instanceof Error ? lastError.message : String(lastError)})`);
}
