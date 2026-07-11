// Fejlesztés közben ezt az egy kapcsolót állítsd át:
// true  -> helyi backend (localhost)
// false -> éles backend (a VITE_API_URL értéke)
export const USE_LOCAL_BACKEND = true;

const LOCAL_BACKEND_URL = "http://localhost:3000";

function getBackendUrl(): string {
  if (USE_LOCAL_BACKEND) {
    return LOCAL_BACKEND_URL;
  }

  const productionBackendUrl = import.meta.env.VITE_API_URL?.trim();

  if (!productionBackendUrl) {
    throw new Error(
      "Az éles backend használatához add meg a VITE_API_URL környezeti változót."
    );
  }

  return productionBackendUrl;
}

export const BACKEND_URL = getBackendUrl();
