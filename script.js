const ACID_VOLUME_L = 0.025;
const MAX_BURETTE_VOLUME_ML = 50;

const indicators = {
  phenolphthalein: {
    name: "fenolftaleïna",
    acidic: "#f7c25c",
    neutral: "#f6d9e6",
    basic: "#d84fa3",
    low: 8.2,
    high: 10
  },
  bromothymol: {
    name: "blau de bromotimol",
    acidic: "#f2c94c",
    neutral: "#49b96f",
    basic: "#3278d0",
    low: 6,
    high: 7.6
  },
  "methyl-orange": {
    name: "taronja de metil",
    acidic: "#e5483f",
    neutral: "#f29d38",
    basic: "#ffd44d",
    low: 3.1,
    high: 4.4
  }
};

const acidStrength = {
  HCl: "strong",
  HNO3: "strong",
  CH3COOH: "weak"
};

const state = {
  addedBaseMl: 0
};

const elements = {
  acid: document.querySelector("#acid"),
  base: document.querySelector("#base"),
  acidConcentration: document.querySelector("#acid-concentration"),
  baseConcentration: document.querySelector("#base-concentration"),
  indicator: document.querySelector("#indicator"),
  addVolume: document.querySelector("#add-volume"),
  reset: document.querySelector("#reset"),
  acidVolume: document.querySelector("#acid-volume"),
  baseVolume: document.querySelector("#base-volume"),
  equivalenceVolume: document.querySelector("#equivalence-volume"),
  phValue: document.querySelector("#ph-value"),
  explanation: document.querySelector("#explanation"),
  solution: document.querySelector("#solution"),
  buretteLiquid: document.querySelector("#burette-liquid"),
  meniscus: document.querySelector("#meniscus"),
  drop: document.querySelector("#drop"),
  stage: document.querySelector("#stage"),
  openInfo: document.querySelector("#open-info"),
  closeInfo: document.querySelector("#close-info"),
  infoModal: document.querySelector("#info-modal")
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getNumber(input, fallback) {
  const value = Number.parseFloat(input.value);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function formatMl(value) {
  return `${value.toFixed(1).replace(".", ",")} mL`;
}

function calculateEquivalenceMl(acidConcentration, baseConcentration) {
  return (acidConcentration * ACID_VOLUME_L / baseConcentration) * 1000;
}

function estimatePh(acidType, acidConcentration, baseConcentration, baseVolumeMl) {
  const acidMoles = acidConcentration * ACID_VOLUME_L;
  const baseMoles = baseConcentration * (baseVolumeMl / 1000);
  const totalVolumeL = ACID_VOLUME_L + baseVolumeMl / 1000;
  const difference = baseMoles - acidMoles;
  const nearEquivalence = Math.abs(difference) < 0.0000001;

  if (nearEquivalence) {
    return acidStrength[acidType] === "weak" ? 8.7 : 7;
  }

  if (difference < 0) {
    const remainingAcid = Math.abs(difference) / totalVolumeL;
    if (acidStrength[acidType] === "weak") {
      return clamp(4.76 + Math.log10(baseMoles / Math.max(Math.abs(difference), 0.0000001)), 2.8, 6.8);
    }
    return clamp(-Math.log10(remainingAcid), 0, 6.9);
  }

  const hydroxide = difference / totalVolumeL;
  return clamp(14 + Math.log10(hydroxide), 7.1, 14);
}

function getIndicatorColor(indicator, ph) {
  if (ph < indicator.low) {
    return indicator.acidic;
  }
  if (ph > indicator.high) {
    return indicator.basic;
  }
  return indicator.neutral;
}

function getStageText(baseVolumeMl, equivalenceMl, ph, indicator) {
  const distance = Math.abs(baseVolumeMl - equivalenceMl);

  if (distance < 0.05) {
    return {
      stage: "Punt d'equivalència",
      explanation: `S'ha arribat al punt d'equivalència: els mols d'àcid i de base són pràcticament iguals. Amb ${indicator.name}, el color és el de la zona de viratge.`
    };
  }

  if (baseVolumeMl < equivalenceMl) {
    return {
      stage: "Abans del punt d'equivalència",
      explanation: `Encara hi ha excés d'àcid. El pH aproximat és ${ph.toFixed(2)} i l'indicador mostra el color de medi àcid o de transició.`
    };
  }

  return {
    stage: "Després del punt d'equivalència",
    explanation: `Hi ha excés de base. El pH aproximat és ${ph.toFixed(2)} i l'indicador mostra el color de medi bàsic.`
  };
}

function updateSimulation() {
  const acidType = elements.acid.value;
  const acidConcentration = getNumber(elements.acidConcentration, 0.1);
  const baseConcentration = getNumber(elements.baseConcentration, 0.1);
  const selectedIndicator = indicators[elements.indicator.value];
  const equivalenceMl = calculateEquivalenceMl(acidConcentration, baseConcentration);
  const ph = estimatePh(acidType, acidConcentration, baseConcentration, state.addedBaseMl);
  const color = getIndicatorColor(selectedIndicator, ph);
  const status = getStageText(state.addedBaseMl, equivalenceMl, ph, selectedIndicator);
  const addedBurettePercent = clamp((state.addedBaseMl / MAX_BURETTE_VOLUME_ML) * 100, 0, 100);

  document.documentElement.style.setProperty("--solution-color", color);
  document.documentElement.style.setProperty("--solution-glow", `${color}77`);

  elements.acidVolume.textContent = formatMl(ACID_VOLUME_L * 1000);
  elements.baseVolume.textContent = formatMl(state.addedBaseMl);
  elements.equivalenceVolume.textContent = formatMl(equivalenceMl);
  elements.phValue.textContent = ph.toFixed(2).replace(".", ",");
  elements.explanation.textContent = status.explanation;
  elements.stage.textContent = status.stage;

  const buretteTop = 18;
  const buretteTotalHeight = 318;
  const liquidY = buretteTop + (addedBurettePercent / 100) * buretteTotalHeight;
  const liquidHeight = buretteTotalHeight - (liquidY - buretteTop);
  elements.buretteLiquid.setAttribute("y", liquidY);
  elements.buretteLiquid.setAttribute("height", liquidHeight);
  elements.meniscus.setAttribute("d", `M268 ${liquidY + 4} Q283 ${liquidY - 2} 298 ${liquidY + 4}`);
}

function animateDrop() {
  elements.drop.classList.remove("active");
  window.requestAnimationFrame(() => {
    elements.drop.classList.add("active");
  });
}

function addVolume() {
  state.addedBaseMl = clamp(state.addedBaseMl + 1, 0, MAX_BURETTE_VOLUME_ML);
  animateDrop();
  updateSimulation();
}

function resetSimulation() {
  state.addedBaseMl = 0;
  updateSimulation();
}

function resetVolumeOnParameterChange() {
  state.addedBaseMl = 0;
  updateSimulation();
}

function openInfoModal() {
  elements.infoModal.classList.add("open");
  elements.infoModal.setAttribute("aria-hidden", "false");
  elements.closeInfo.focus();
}

function closeInfoModal() {
  elements.infoModal.classList.remove("open");
  elements.infoModal.setAttribute("aria-hidden", "true");
  elements.openInfo.focus();
}

elements.addVolume.addEventListener("click", addVolume);
elements.reset.addEventListener("click", resetSimulation);
elements.openInfo.addEventListener("click", openInfoModal);
elements.closeInfo.addEventListener("click", closeInfoModal);
elements.infoModal.addEventListener("click", (event) => {
  if (event.target === elements.infoModal) {
    closeInfoModal();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && elements.infoModal.classList.contains("open")) {
    closeInfoModal();
  }
});
elements.acid.addEventListener("change", resetVolumeOnParameterChange);
elements.base.addEventListener("change", resetVolumeOnParameterChange);
elements.indicator.addEventListener("change", updateSimulation);
elements.acidConcentration.addEventListener("input", resetVolumeOnParameterChange);
elements.baseConcentration.addEventListener("input", resetVolumeOnParameterChange);

updateSimulation();
