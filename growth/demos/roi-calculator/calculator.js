(function () {
  "use strict";

  var currentCost = document.getElementById("currentCost");
  var currentCostRange = document.getElementById("currentCostRange");
  var migrationCost = document.getElementById("migrationCost");
  var migrationCostRange = document.getElementById("migrationCostRange");
  var annualSavings = document.getElementById("annualSavings");
  var annualSavingsRange = document.getElementById("annualSavingsRange");

  var paybackPeriodEl = document.getElementById("paybackPeriod");
  var annualSavingsOutEl = document.getElementById("annualSavingsOut");
  var threeYearRoiEl = document.getElementById("threeYearRoi");
  var footnoteEl = document.getElementById("footnote");

  var usdFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  function linkPair(numberInput, rangeInput) {
    numberInput.addEventListener("input", function () {
      rangeInput.value = numberInput.value;
      recalculate();
    });
    rangeInput.addEventListener("input", function () {
      numberInput.value = rangeInput.value;
      recalculate();
    });
  }

  function num(el) {
    var v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
  }

  function recalculate() {
    var migration = num(migrationCost);
    var savings = num(annualSavings);

    annualSavingsOutEl.textContent = usdFormatter.format(savings);

    if (savings <= 0) {
      paybackPeriodEl.textContent = "N/A";
      threeYearRoiEl.textContent = "N/A";
      footnoteEl.textContent =
        "Enter an expected annual savings above zero to compute payback period and ROI.";
      return;
    }

    var paybackYears = migration / savings;
    var threeYearNet = savings * 3 - migration;
    var threeYearRoiPct = migration > 0 ? (threeYearNet / migration) * 100 : null;

    if (paybackYears < 1) {
      paybackPeriodEl.textContent = Math.round(paybackYears * 12) + " months";
    } else {
      paybackPeriodEl.textContent = paybackYears.toFixed(1) + " years";
    }

    if (threeYearRoiPct === null) {
      threeYearRoiEl.textContent = "N/A (no migration cost entered)";
    } else {
      var sign = threeYearRoiPct >= 0 ? "+" : "";
      threeYearRoiEl.textContent = sign + threeYearRoiPct.toFixed(0) + "%";
    }

    footnoteEl.textContent =
      "Over 3 years: " +
      usdFormatter.format(savings * 3) +
      " in cumulative savings against " +
      usdFormatter.format(migration) +
      " migration cost = " +
      usdFormatter.format(threeYearNet) +
      " net.";
  }

  linkPair(currentCost, currentCostRange);
  linkPair(migrationCost, migrationCostRange);
  linkPair(annualSavings, annualSavingsRange);

  recalculate();
})();
