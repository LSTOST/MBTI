const env = {
  databaseUrl: process.env.DATABASE_URL,
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterModel: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
  openRouterHttpReferer: process.env.OPENROUTER_HTTP_REFERER,
  openRouterAppTitle: process.env.OPENROUTER_APP_TITLE,
  paymentProvider: (process.env.PAYMENT_PROVIDER || "mock").toLowerCase(),
  /** 微信/支付宝 H5 等：模板里用 {{reportId}}，跳转后由支付平台异步通知服务端核销 */
  paymentCheckoutUrlTemplate: process.env.PAYMENT_CHECKOUT_URL_TEMPLATE,
};

export function getEnv() {
  return env;
}

