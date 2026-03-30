(function injectMetaAiRouterTrigger() {
  const HOST_ID = "meta-ai-router-host";

  if (document.getElementById(HOST_ID)) {
    return;
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.right = "20px";
  host.style.bottom = "20px";
  host.style.zIndex = "2147483647";

  const shadowRoot = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    .meta-ai-router-button {
      all: initial;
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 16px;
      border: 0;
      border-radius: 999px;
      background: linear-gradient(135deg, #5249b8, #0c8c70);
      color: #ffffff;
      font: 600 13px "Trebuchet MS", Arial, sans-serif;
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
      cursor: pointer;
      transition: transform 120ms ease, box-shadow 120ms ease;
    }

    .meta-ai-router-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 14px 30px rgba(0, 0, 0, 0.28);
    }

    .meta-ai-router-button:focus-visible {
      outline: 2px solid #ffffff;
      outline-offset: 2px;
    }
  `;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "meta-ai-router-button";
  button.textContent = "Open Pontis";
  button.setAttribute("aria-label", "Open Pontis");
  button.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "open_popup" });
  });

  shadowRoot.appendChild(style);
  shadowRoot.appendChild(button);
  document.documentElement.appendChild(host);
})();
