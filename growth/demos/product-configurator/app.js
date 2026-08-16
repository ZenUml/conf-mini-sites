(function () {
  "use strict";

  var regionEl = document.getElementById("region");
  var usersEl = document.getElementById("users");
  var usersUnitEl = document.getElementById("usersUnit");
  var planEl = document.getElementById("plan");
  var storageEl = document.getElementById("storage");
  var intSsoEl = document.getElementById("intSso");
  var intApiEl = document.getElementById("intApi");
  var intAuditEl = document.getElementById("intAudit");
  var intDataResidencyEl = document.getElementById("intDataResidency");

  var architectureOutEl = document.getElementById("architectureOut");
  var costOutEl = document.getElementById("costOut");
  var featureListEl = document.getElementById("featureList");
  var footnoteEl = document.getElementById("footnote");

  var usdFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  var REGION_LABELS = { us: "United States", eu: "European Union", apac: "Asia-Pacific" };
  var REGION_MULTIPLIER = { us: 1.0, eu: 1.08, apac: 0.95 };
  var PLAN_LABELS = { starter: "Starter", business: "Business", enterprise: "Enterprise" };
  var PLAN_RATE = { starter: 8, business: 15, enterprise: 28 };
  var STORAGE_LABELS = {
    standard: "Standard (100 GB pooled)",
    extended: "Extended (1 TB pooled)",
    unlimited: "Unlimited (metered)",
  };

  // Feature availability by plan tier — "yes" (on by default), "optional"
  // (available if the reader toggles it on), or "no" (not offered on this plan).
  var FEATURE_MATRIX = {
    starter: { sso: "no", api: "optional", audit: "no", dataResidency: "no", prioritySupport: "no", customSla: "no" },
    business: { sso: "optional", api: "optional", audit: "optional", dataResidency: "no", prioritySupport: "yes", customSla: "no" },
    enterprise: { sso: "optional", api: "optional", audit: "optional", dataResidency: "optional", prioritySupport: "yes", customSla: "yes" },
  };

  function num(el) {
    var v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
  }

  function storageCost(storage, users) {
    if (storage === "extended") return 200;
    if (storage === "unlimited") return 400 + 2 * users;
    return 0;
  }

  function architectureFor(users, plan, storage, dataResidency, region) {
    if (plan === "enterprise" && dataResidency) {
      return (
        "Multi-region active-active cluster, dedicated tenant, data pinned to " +
        REGION_LABELS[region] +
        "."
      );
    }
    if (plan === "enterprise" || users > 200) {
      return "Multi-region dedicated tenant with active-active replication across 3 zones.";
    }
    if (users > 25 || plan === "business") {
      var storageNote = storage === "unlimited" ? " with metered object storage" : "";
      return "Single-region dedicated tenant, standard replication" + storageNote + ".";
    }
    return "Single-region shared cluster, standard replication.";
  }

  function featureRow(label, state, checked) {
    var li = document.createElement("li");
    var dot = document.createElement("span");
    var text = document.createElement("span");

    if (state === "no") {
      dot.className = "dot dot--no";
      li.className = "unavailable";
      text.textContent = label + " — not on this plan";
    } else if (state === "optional" && !checked) {
      dot.className = "dot dot--warn";
      text.textContent = label + " — available, not enabled";
    } else if (state === "optional" && checked) {
      dot.className = "dot dot--yes";
      text.textContent = label + " — enabled";
    } else {
      // state === "yes"
      dot.className = "dot dot--yes";
      text.textContent = label + " — included";
    }

    li.appendChild(dot);
    li.appendChild(text);
    return li;
  }

  function recalculate() {
    var region = regionEl.value;
    var users = Math.max(1, Math.round(num(usersEl)));
    var plan = planEl.value;
    var storage = storageEl.value;
    var sso = intSsoEl.checked;
    var api = intApiEl.checked;
    var audit = intAuditEl.checked;
    var dataResidency = intDataResidencyEl.checked;

    usersUnitEl.textContent = users;

    var features = FEATURE_MATRIX[plan];

    // Data residency and audit log only actually apply if the plan offers them.
    var dataResidencyActive = features.dataResidency === "optional" && dataResidency;
    var auditActive = features.audit !== "no" && audit;
    var apiActive = features.api !== "no" && api;
    var ssoActive = features.sso === "yes" || (features.sso === "optional" && sso);

    architectureOutEl.textContent = architectureFor(users, plan, storage, dataResidencyActive, region);

    var base = PLAN_RATE[plan] * users * REGION_MULTIPLIER[region];
    var addOns = storageCost(storage, users);
    if (apiActive && plan === "starter") addOns += 3 * users;
    if (auditActive) addOns += 150;
    if (dataResidencyActive) addOns += 500;

    var total = base + addOns;
    costOutEl.textContent = usdFormatter.format(total) + " / mo";

    featureListEl.innerHTML = "";
    featureListEl.appendChild(featureRow("SSO / SAML", features.sso, ssoActive));
    featureListEl.appendChild(featureRow("API access", features.api, apiActive));
    featureListEl.appendChild(featureRow("Audit log export", features.audit, auditActive));
    featureListEl.appendChild(featureRow("Data residency controls", features.dataResidency, dataResidencyActive));
    featureListEl.appendChild(featureRow("Priority support", features.prioritySupport, features.prioritySupport === "yes"));
    featureListEl.appendChild(featureRow("Custom SLA", features.customSla, features.customSla === "yes"));

    footnoteEl.textContent =
      PLAN_LABELS[plan] +
      " plan, " +
      users +
      " users in " +
      REGION_LABELS[region] +
      ", " +
      STORAGE_LABELS[storage].toLowerCase() +
      " storage: base " +
      usdFormatter.format(base) +
      "/mo + add-ons " +
      usdFormatter.format(addOns) +
      "/mo = " +
      usdFormatter.format(total) +
      "/mo estimate.";
  }

  [regionEl, usersEl, planEl, storageEl, intSsoEl, intApiEl, intAuditEl, intDataResidencyEl].forEach(function (el) {
    el.addEventListener("input", recalculate);
    el.addEventListener("change", recalculate);
  });

  recalculate();
})();
