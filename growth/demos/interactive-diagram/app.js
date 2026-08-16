(function () {
  "use strict";

  // Detail data for every clickable node and edge in the diagram.
  // This is the payload a real architecture-docs author would edit per-project.
  var DATA = {
    nodes: {
      viewer: {
        title: "Confluence Page",
        kicker: "Client / entry point",
        owner: "Docs platform team",
        protocol: "Forge Custom UI (bridge/iframe), served over HTTPS",
        deps: ["Forge runtime", "Control Worker"],
        risk: "None directly — inherits Confluence's own page permissions; the macro has no auth logic of its own."
      },
      control: {
        title: "Control Worker",
        kicker: "Service",
        owner: "Platform team — mini-sites repo, src/worker/",
        protocol: "Forge invokeRemote (FIT-verified) + HTTPS REST for publish/serve-url",
        deps: ["D1 (instance + grant records)", "Workers for Platforms REST API", "Dispatch Worker (shared HMAC key)"],
        risk: "Single point of failure for provisioning and grant-minting. A leaked K_GRANT key would let an attacker mint valid serve grants."
      },
      dispatch: {
        title: "Dispatch Worker",
        kicker: "Service",
        owner: "Platform team — mini-sites repo, src/dispatch/",
        protocol: "HTTPS, verifies signed HMAC grant before routing",
        deps: ["Per-instance Workers (dispatch-namespace binding)", "K_GRANT (must match Control Worker's key)"],
        risk: "If K_GRANT drifts out of sync with the Control Worker for an environment, every serve request fails closed with 401."
      },
      instance: {
        title: "ms-<instanceId>",
        kicker: "Per-tenant Worker",
        owner: "Provisioned automatically — not directly owned by a team",
        protocol: "Internal-only (WfP namespace, non-routable from the public internet)",
        deps: ["Bundle bytes uploaded at publish time"],
        risk: "Bundles are secret-scanned at publish time, but a missed pattern would be served as-is — no runtime sanitization layer."
      },
      d1: {
        title: "D1 (SQLite)",
        kicker: "Data store",
        owner: "Platform team",
        protocol: "Workers Binding (internal, no public network path)",
        deps: ["Control Worker (read/write)", "Uninstall GC sweep (scheduled, currently dormant)"],
        risk: "Uninstall GC exists in code but the binding + cron are commented out — tombstoned instances are not yet cleaned up automatically."
      }
    },
    edges: {
      "macro-control": {
        title: "Macro → Control Worker",
        kicker: "Data flow",
        owner: "Platform team",
        protocol: "invokeRemote (getServeUrl, publish) — FIT-verified when the binding is present",
        deps: ["Forge FIT token", "Control Worker auth check"],
        risk: "FIT verification only covers invokeRemote calls, not raw api.fetch egress — noted as a known gap in the security review."
      },
      "control-dispatch": {
        title: "Control Worker → Dispatch Worker",
        kicker: "Data flow",
        owner: "Platform team",
        protocol: "Signed-path grant, HMAC-256, short-lived (minutes)",
        deps: ["K_GRANT shared secret"],
        risk: "Grant TTL is short by design; expired grants must be re-minted, which can surface as a transient failure if clocks skew."
      },
      "dispatch-instance": {
        title: "Dispatch Worker → ms-<instanceId>",
        kicker: "Data flow",
        owner: "Platform team",
        protocol: "Dispatch-namespace binding (Workers for Platforms), not public HTTP",
        deps: ["WfP dispatch namespace mini-sites-{dev,staging,prod}"],
        risk: "A misrouted instanceId would serve the wrong tenant's bundle — mitigated by deriving instanceId server-side, not trusting client input."
      },
      "control-d1": {
        title: "Control Worker → D1",
        kicker: "Data flow",
        owner: "Platform team",
        protocol: "Workers Binding query (parameterized SQL)",
        deps: ["Instance table", "Grant/uninstall tombstone table"],
        risk: "No read replica — a D1 outage blocks both new publishes and new serve-url grants."
      },
      "instance-viewer": {
        title: "ms-<instanceId> → Confluence Page",
        kicker: "Data flow",
        owner: "Platform team",
        protocol: "HTTPS response, bundle bytes + injected <base> tag + CSP headers",
        deps: ["Dispatch Worker routing", "Bundle's own relative asset paths"],
        risk: "A bundle with absolute (non-relative) asset paths can break under the injected <base> — validated at publish time."
      }
    }
  };

  var detailEl = document.getElementById("detail");
  var svg = document.getElementById("diagram");

  function clearActive() {
    svg.querySelectorAll(".is-active").forEach(function (el) {
      el.classList.remove("is-active");
    });
  }

  function renderDetail(entry) {
    var depsHtml = entry.deps
      .map(function (d) {
        return "<li>" + escapeHtml(d) + "</li>";
      })
      .join("");

    detailEl.innerHTML =
      '<p class="detail__kicker">' + escapeHtml(entry.kicker) + "</p>" +
      '<h2 class="detail__title">' + escapeHtml(entry.title) + "</h2>" +
      '<div class="detail__field">' +
        '<p class="detail__field-label">Owner</p>' +
        '<p class="detail__field-value">' + escapeHtml(entry.owner) + "</p>" +
      "</div>" +
      '<div class="detail__field">' +
        '<p class="detail__field-label">API / Protocol</p>' +
        '<p class="detail__field-value">' + escapeHtml(entry.protocol) + "</p>" +
      "</div>" +
      '<div class="detail__field">' +
        '<p class="detail__field-label">Dependencies</p>' +
        '<ul class="detail__deps">' + depsHtml + "</ul>" +
      "</div>" +
      '<div class="detail__field">' +
        '<p class="detail__field-label">Risk</p>' +
        '<p class="detail__field-value risk">' + escapeHtml(entry.risk) + "</p>" +
      "</div>";
  }

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function selectNode(key) {
    var entry = DATA.nodes[key];
    if (!entry) return;
    clearActive();
    var el = svg.querySelector('.node[data-node="' + key + '"]');
    if (el) el.classList.add("is-active");
    renderDetail(entry);
  }

  function selectEdge(key) {
    var entry = DATA.edges[key];
    if (!entry) return;
    clearActive();
    var visible = svg.querySelector('.edge[data-edge="' + key + '"]');
    var hit = svg.querySelector('.edge-hit[data-edge="' + key + '"]');
    if (visible) visible.classList.add("is-active");
    if (hit) hit.classList.add("is-active");
    renderDetail(entry);
  }

  svg.querySelectorAll(".node").forEach(function (el) {
    var key = el.getAttribute("data-node");
    el.addEventListener("click", function () {
      selectNode(key);
    });
    el.addEventListener("keydown", function (evt) {
      if (evt.key === "Enter" || evt.key === " ") {
        evt.preventDefault();
        selectNode(key);
      }
    });
  });

  svg.querySelectorAll(".edge-hit").forEach(function (el) {
    var key = el.getAttribute("data-edge");
    el.addEventListener("click", function () {
      selectEdge(key);
    });
  });
})();
