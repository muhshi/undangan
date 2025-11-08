// guest-local.js - Minimal version for debugging

console.log("[guest-local] Loading...");

// Auto-detect environment
if (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
) {
  document.body.dataset.url = "http://10.133.21.24:8002/api/v1";
} else {
  document.body.dataset.url = "/api/v1";
}

console.log("[guest-local] API URL:", document.body.dataset.url);
console.log(
  "[guest-local] Ready. No auto-click. User must manually open invitation."
);
