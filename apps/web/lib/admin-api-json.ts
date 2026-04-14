/** 管理端 fetch 统一解析 JSON，避免空 body / HTML 报错页导致 JSON.parse 抛错 */
export async function readAdminJson<T>(
  res: Response,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const text = await res.text();
  if (!text.trim()) {
    return { ok: false, message: `服务返回空响应（HTTP ${res.status}）` };
  }
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return {
      ok: false,
      message: `响应不是合法 JSON（HTTP ${res.status}），请查看服务端日志`,
    };
  }
}
