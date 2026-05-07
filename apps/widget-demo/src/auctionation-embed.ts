const currentScript = document.currentScript as HTMLScriptElement | null;

function requireDatasetValue(name: string, fallback?: string): string {
  const value = currentScript?.dataset[name] ?? fallback;
  if (!value) {
    throw new Error(`Auctionation embed is missing data-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}.`);
  }
  return value;
}

const containerId = requireDatasetValue("container");
const embedOrigin = requireDatasetValue("embedOrigin", "http://localhost:5174");
const tenant = requireDatasetValue("tenant");
const auction = requireDatasetValue("auction");
const container = document.getElementById(containerId);

if (!container) {
  throw new Error(`Auctionation embed container #${containerId} was not found.`);
}

const iframe = document.createElement("iframe");
const sourceUrl = new URL(embedOrigin);
sourceUrl.searchParams.set("tenant", tenant);
sourceUrl.searchParams.set("auction", auction);

iframe.src = sourceUrl.toString();
iframe.title = "Auctionation silent auction";
iframe.loading = "lazy";
iframe.style.border = "0";
iframe.style.width = "100%";
iframe.style.minHeight = "720px";
iframe.style.borderRadius = "18px";
iframe.style.background = "#fff";

window.addEventListener("message", (event) => {
  if (event.origin !== sourceUrl.origin) return;
  if (event.data?.type !== "auctionation:embed:resize") return;
  if (typeof event.data.height !== "number") return;

  iframe.style.height = `${Math.max(event.data.height, 720)}px`;
});

container.replaceChildren(iframe);