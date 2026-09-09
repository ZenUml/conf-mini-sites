#!/usr/bin/env python3
"""Summarize a Marketplace P&S REST payload (stdin) and flag deviations from the Mini Sites target.
Args: <appKey> <expected_sub_count>.  Used by verify-ps.sh; not meant to be called directly.

Canonical target = the answers Atlassian approved in 2026-07 (listing went public 2026-07-22):
stores/process EUD outside Atlassian = Yes/Yes (bundles are hosted on Cloudflare) · no data residency ·
retention INDEFINITE, custom period disallowed (deletion-on-uninstall is implemented but dormant until
D1 + the GC cron are live — the form must keep saying "indefinitely" until then) · one sub-processor
(Cloudflare, US) · GDPR controller No / processor Yes · CCPA business No / service provider Yes ·
disk encryption Yes · EEA transfer Yes with SCCs · DPA No · security contact support@zenuml.com."""
import json, sys

key = sys.argv[1] if len(sys.argv) > 1 else "?"
exp_subs = int(sys.argv[2]) if len(sys.argv) > 2 else 0
d = json.load(sys.stdin)

das = d["dataAccessAndStorage"]; pr = d["privacy"]; sec = d["security"]
dr = d.get("dataRetention", {})
tp = (d.get("thirdPartyInformation") or {}).get("thirdPartyDetails") or []
sp = pr["ccpa"]["serviceProvider"]
bad = 0

def line(label, got, ok):
    global bad
    if not ok: bad += 1
    print(("  OK  " if ok else "  !!  ") + label.ljust(24) + str(got))

def up(v): return str(v).upper()

print("=== P&S: %s   formStatus=%s ===" % (key, d["properties"].get("formStatus")))
line("stores/process EUD",
     "%s/%s" % (das.get("appStoresEUDOutsideAtlassian"), das.get("appProcessEUDOutsideAtlassian")),
     das.get("appStoresEUDOutsideAtlassian") is True and das.get("appProcessEUDOutsideAtlassian") is True)
line("data residency", d["dataResidency"].get("isDataResidencySupported"),
     d["dataResidency"].get("isDataResidencySupported") == "APP_DOES_NOT_SUPPORT_DR")
line("retention indefinite/custom",
     "indefinite=%s / custom=%s" % (dr.get("isRetentionDurationIndefinite"), dr.get("isCustomRetentionPeriodAllowed")),
     dr.get("isRetentionDurationIndefinite") is True and dr.get("isCustomRetentionPeriodAllowed") is False)
line("sub-processors", "%d %s" % (len(tp), [e.get("name", "")[:16] for e in tp]),
     (len(tp) == exp_subs and any("Cloudflare" in (e.get("name") or "") for e in tp)) if exp_subs else True)
line("gdpr controller", pr["gdpr"]["dataController"].get("isAppDataController"),
     up(pr["gdpr"]["dataController"].get("isAppDataController")) == "FALSE")
line("gdpr processor", pr["gdpr"]["dataProcessor"].get("isAppDataProcessor"),
     up(pr["gdpr"]["dataProcessor"].get("isAppDataProcessor")) == "TRUE")
line("ccpa business", pr["ccpa"]["business"].get("isAppBusiness"),
     up(pr["ccpa"]["business"].get("isAppBusiness")) == "FALSE")
line("ccpa serviceProvider", sp.get("isAppServiceProvider"),
     up(sp.get("isAppServiceProvider")) == "TRUE")
line("  svcProvider EUD", sp.get("endUserDataTypes"), bool(sp.get("endUserDataTypes")))
line("dpa", pr.get("dataProcessingAgreement", {}).get("isDPASupported"),
     up(pr.get("dataProcessingAgreement", {}).get("isDPASupported")) == "FALSE")
line("disk encryption", sec.get("isDiskEncryptionSupported"), sec.get("isDiskEncryptionSupported") is True)
line("security contact", sec.get("securityContact"), sec.get("securityContact") == "support@zenuml.com")
dt = pr["gdpr"].get("dataTransfer", {})
line("EEA transfer/mech",
     "%s/%s" % (dt.get("isEndUserDataTransferredOutsideEEA"), dt.get("isTransferComplianceMechanismsAdhered")),
     dt.get("isEndUserDataTransferredOutsideEEA") is True and dt.get("isTransferComplianceMechanismsAdhered") is True)
# Informational: not part of the approved target, but worth seeing at a glance.
print("  info  security policy URL   %s" % sec.get("publicSecurityPoliciesLink"))
print("  info  permissionsJustif     %s" % sec.get("permissionsJustification"))
print("  --> %d field(s) deviate from canonical target (%s)" %
      (bad, "clean" if bad == 0 else "confirm each !! is intentional"))
