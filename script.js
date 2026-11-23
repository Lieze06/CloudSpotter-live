const screens = [...document.querySelectorAll(".screen")];
const home = document.querySelector("#home");
const artworkSource = document.querySelector(".artwork-source");
const artworkCanvas = document.querySelector(".artwork-static");
const artworkStatus = document.querySelector(".artwork-status");
const toast = document.querySelector(".toast");
const indexDialog = document.querySelector(".index-dialog");
const clickClouds = document.querySelector(".click-clouds");
const cloudBoxes = [
  { selector: ".cloud-1", left: 0.07, top: 0.24, width: 0.22, height: 0.19 },
  { selector: ".cloud-2", left: 0.4, top: 0.16, width: 0.22, height: 0.19 },
  { selector: ".cloud-3", left: 0.71, top: 0.32, width: 0.22, height: 0.19 },
  { selector: ".cloud-4", left: 0.08, top: 0.51, width: 0.22, height: 0.19 },
  { selector: ".cloud-5", left: 0.4, top: 0.5, width: 0.22, height: 0.19 },
  { selector: ".cloud-6", left: 0.71, top: 0.6, width: 0.22, height: 0.19 },
  { selector: ".cloud-7", left: 0.2, top: 0.77, width: 0.22, height: 0.19 },
  { selector: ".cloud-8", left: 0.53, top: 0.78, width: 0.22, height: 0.19 },
];
let activeScreen = home;
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function transitionTo(id, { updateHistory = true } = {}) {
  const nextScreen = document.getElementById(id);
  if (!nextScreen || !nextScreen.classList.contains("screen")) return;
  if (nextScreen === activeScreen) return;

  if (updateHistory && location.hash !== `#${id}`) {
    history.pushState({ screen: id }, "", `#${id}`);
  }

  const previousScreen = activeScreen;
  nextScreen.inert = false;
  nextScreen.setAttribute("aria-hidden", "false");
  nextScreen.classList.remove("is-exiting");
  void nextScreen.offsetWidth;
  nextScreen.classList.add("is-active");

  if (previousScreen) {
    previousScreen.classList.remove("is-active");
    previousScreen.classList.add("is-exiting");
    previousScreen.inert = true;
    previousScreen.setAttribute("aria-hidden", "true");
    window.setTimeout(() => previousScreen.classList.remove("is-exiting"), 900);
  }

  activeScreen = nextScreen;
  if (id === "edition-5") {
    const scrollRegion = nextScreen.querySelector(".day-scroll");
    scrollRegion.scrollTop = 0;
  }
  nextScreen.scrollTop = 0;
}

document.addEventListener("click", (event) => {
  const upcoming = event.target.closest("[data-upcoming]");
  if (upcoming) {
    event.preventDefault();
    showToast(`Editie ${upcoming.dataset.upcoming} komt eraan. Kijk later nog eens omhoog.`);
    return;
  }

  const route = event.target.closest('a[href^="#"]');
  if (route) {
    const id = route.getAttribute("href").slice(1);
    if (document.getElementById(id)?.classList.contains("screen")) {
      event.preventDefault();
      if (indexDialog.open) indexDialog.close();
      transitionTo(id);
    }
  }
});

document.querySelector(".index-hotspot").addEventListener("click", () => {
  if (!indexDialog.open) indexDialog.showModal();
});

indexDialog.addEventListener("click", (event) => {
  if (event.target === indexDialog) indexDialog.close();
});

function syncScreenFromHash() {
  const id = location.hash.slice(1);
  transitionTo(document.getElementById(id)?.classList.contains("screen") ? id : "home", {
    updateHistory: false,
  });
}

window.addEventListener("popstate", syncScreenFromHash);
window.addEventListener("hashchange", syncScreenFromHash);
screens.forEach((screen) => {
  const active = screen === home;
  screen.inert = !active;
  screen.setAttribute("aria-hidden", String(!active));
});
if (location.hash) syncScreenFromHash();

function keyOutSky(imageData, sky) {
  const pixels = imageData.data;
  for (let index = 0; index < pixels.length; index += 4) {
    const isSky = Math.abs(pixels[index] - sky[0]) < 13
      && Math.abs(pixels[index + 1] - sky[1]) < 13
      && Math.abs(pixels[index + 2] - sky[2]) < 13;
    if (isSky) pixels[index + 3] = 0;
  }
  return imageData;
}

async function prepareArtwork() {
  if (!artworkSource || !artworkCanvas) return;
  try {
    await artworkSource.decode();
    const { naturalWidth: width, naturalHeight: height } = artworkSource;
    const sourceCanvas = document.createElement("canvas");
    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    const staticContext = artworkCanvas.getContext("2d", { willReadFrequently: true });
    if (!sourceContext || !staticContext) throw new Error("Canvas is niet beschikbaar.");

    sourceCanvas.width = width;
    sourceCanvas.height = height;
    sourceContext.drawImage(artworkSource, 0, 0);
    const skyPixel = sourceContext.getImageData(2, 2, 1, 1).data;
    const sky = [skyPixel[0], skyPixel[1], skyPixel[2]];
    const skyColor = `rgb(${sky.join(", ")})`;

    artworkCanvas.width = width;
    artworkCanvas.height = height;
    staticContext.drawImage(artworkSource, 0, 0);
    document.documentElement.style.setProperty("--sky", skyColor);
    document.body.style.backgroundColor = skyColor;
    document.querySelector(".home-artboard").style.backgroundColor = skyColor;

    cloudBoxes.forEach((box) => {
      const left = Math.round(box.left * width);
      const top = Math.round(box.top * height);
      const cloudWidth = Math.round(box.width * width);
      const cloudHeight = Math.round(box.height * height);
      const cloud = document.querySelector(`${box.selector} canvas`);
      const cloudContext = cloud.getContext("2d", { willReadFrequently: true });
      if (!cloudContext) throw new Error("Een wolkcanvas kon niet worden aangemaakt.");

      cloud.width = cloudWidth;
      cloud.height = cloudHeight;
      cloudContext.drawImage(sourceCanvas, left, top, cloudWidth, cloudHeight, 0, 0, cloudWidth, cloudHeight);
      const cloudImage = keyOutSky(cloudContext.getImageData(0, 0, cloudWidth, cloudHeight), sky);
      cloudContext.putImageData(cloudImage, 0, 0);
    });
    artworkSource.classList.add("is-hidden");
  } catch (error) {
    artworkStatus.textContent = "De originele voorpagina kon niet volledig worden klaargezet.";
    console.error("Cloudspotter artwork kon niet worden verwerkt:", error);
  }
}

prepareArtwork();

document.querySelectorAll(".edition-cloud").forEach((cloud) => {
  cloud.addEventListener("click", (event) => {
    const edition = cloud.getAttribute("href").slice(1);
    if (document.getElementById(edition)?.classList.contains("screen")) {
      event.preventDefault();
      transitionTo(edition);
    }
  });
});

function addClickCloud(event) {
  if (event.target.closest("a, button, input, dialog")) return;
  const puff = document.createElement("span");
  puff.className = "click-puff";
  puff.style.left = `${event.clientX}px`;
  puff.style.top = `${event.clientY}px`;
  puff.style.setProperty("--puff-size", `${36 + Math.random() * 32}px`);
  puff.style.setProperty("--puff-x", `${Math.round(Math.random() * 48 - 24)}px`);
  puff.style.setProperty("--puff-y", `${Math.round(-34 - Math.random() * 30)}px`);
  clickClouds.append(puff);
  puff.addEventListener("animationend", () => puff.remove(), { once: true });
}

document.addEventListener("pointerdown", addClickCloud);

const wordmark = document.querySelector(".cloud-wordmark");
const word = wordmark.textContent;
wordmark.replaceChildren(...[...word].map((letter) => {
  const span = document.createElement("span");
  span.className = "title-letter";
  span.textContent = letter;
  span.setAttribute("aria-hidden", "true");
  return span;
}));
wordmark.setAttribute("aria-label", word);

const titleLetters = [...wordmark.querySelectorAll(".title-letter")];
let titleResetTimer;

titleLetters.forEach((letter, index) => {
  letter.addEventListener("pointerenter", (event) => {
    window.clearTimeout(titleResetTimer);
    const rect = letter.getBoundingClientRect();
    const wind = event.clientX < rect.left + rect.width / 2 ? -1 : 1;

    titleLetters.forEach((neighbor) => neighbor.classList.remove("is-blown"));

    const affected = titleLetters.slice(Math.max(0, index - 1), Math.min(titleLetters.length, index + 2));
    affected.forEach((neighbor, offset) => {
      const distance = Math.abs(titleLetters.indexOf(neighbor) - index);
      neighbor.style.setProperty("--blast-x", `${wind * (38 + offset * 16 + distance * 8)}px`);
      neighbor.style.setProperty("--blast-y", `${(offset === 0 ? -18 : offset === 1 ? 10 : 24) + distance * 4}px`);
      neighbor.style.setProperty("--blast-rotate", `${wind * (5 + offset * 3)}deg`);
      neighbor.style.setProperty("--blast-opacity", `${0.58 - distance * 0.12}`);
      neighbor.style.setProperty("--blast-blur", `${1.2 + distance * 1.4}px`);
      neighbor.classList.add("is-blown");
    });
  });

  letter.addEventListener("pointerleave", () => {
    window.clearTimeout(titleResetTimer);
    titleResetTimer = window.setTimeout(() => {
      titleLetters.forEach((neighbor) => neighbor.classList.remove("is-blown"));
    }, 260);
  });
});

wordmark.addEventListener("pointerleave", () => {
  window.clearTimeout(titleResetTimer);
  titleResetTimer = window.setTimeout(() => {
    titleLetters.forEach((neighbor) => neighbor.classList.remove("is-blown"));
  }, 260);
});
titleLetters.forEach((letter) => {
  letter.addEventListener("focus", () => letter.classList.add("is-blown"));
  letter.addEventListener("blur", () => {
    titleLetters.forEach((neighbor) => neighbor.classList.remove("is-blown"));
  });
});

const editionLead = document.querySelector(".edition-lead");
if (editionLead) {
  const leadText = editionLead.textContent.trim();
  editionLead.replaceChildren(...[...leadText].map((character) => {
    const span = document.createElement("span");
    span.className = character === " " ? "lead-space" : "lead-letter";
    span.textContent = character;
    if (character === " ") {
      span.setAttribute("aria-hidden", "true");
    }
    return span;
  }));
  editionLead.setAttribute("aria-label", leadText);

  const leadLetters = [...editionLead.querySelectorAll(".lead-letter")];
  let leadResetTimer;

  leadLetters.forEach((letter, index) => {
    letter.addEventListener("pointerenter", (event) => {
      window.clearTimeout(leadResetTimer);
      const rect = letter.getBoundingClientRect();
      const wind = event.clientX < rect.left + rect.width / 2 ? -1 : 1;
      leadLetters.forEach((neighbor) => neighbor.classList.remove("is-blown"));

      leadLetters.slice(Math.max(0, index - 1), Math.min(leadLetters.length, index + 2)).forEach((neighbor, offset) => {
        const distance = Math.abs(leadLetters.indexOf(neighbor) - index);
        neighbor.style.setProperty("--lead-x", `${wind * (34 + offset * 10 + distance * 6)}px`);
        neighbor.style.setProperty("--lead-y", `${offset === 0 ? -14 : offset === 1 ? 10 : 18}px`);
        neighbor.style.setProperty("--lead-rotate", `${wind * (4 + offset * 2)}deg`);
        neighbor.style.setProperty("--lead-opacity", `${0.58 - distance * 0.12}`);
        neighbor.classList.add("is-blown");
      });
    });
    letter.addEventListener("pointerleave", () => {
      window.clearTimeout(leadResetTimer);
      leadResetTimer = window.setTimeout(() => {
        leadLetters.forEach((neighbor) => neighbor.classList.remove("is-blown"));
      }, 260);
    });
  });
}

const weatherSymbols = [...document.querySelectorAll(".weather-symbol")];
const weatherZones = [...document.querySelectorAll(".weather-zone")];
const rankingStatus = document.querySelector(".ranking-status");
let draggedWeather = null;

function celebrate() {
  const celebration = document.querySelector(".celebration");
  celebration.setAttribute("aria-hidden", "false");
  const colors = ["#fff", "#ffcf66", "#0878c5", "#f48fb1", "#7ed6a1"];
  for (let i = 0; i < 42; i += 1) {
    const flag = document.createElement("i");
    flag.style.left = `${Math.random() * 100}%`;
    flag.style.setProperty("--drift", `${Math.random() * 160 - 80}px`);
    flag.style.setProperty("--flag", colors[i % colors.length]);
    flag.style.animationDelay = `${Math.random() * .7}s`;
    celebration.append(flag);
    flag.addEventListener("animationend", () => flag.remove(), { once: true });
  }
  try {
    const audio = new (window.AudioContext || window.webkitAudioContext)();
    [523, 659, 784, 1046].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(.0001, audio.currentTime + index * .12);
      gain.gain.exponentialRampToValueAtTime(.12, audio.currentTime + index * .12 + .02);
      gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + index * .12 + .32);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(audio.currentTime + index * .12);
      oscillator.stop(audio.currentTime + index * .12 + .34);
    });
  } catch (_) {
    // The visual celebration remains available when browser audio is blocked.
  }
}

function checkWeatherComplete() {
  const assigned = weatherZones.reduce((count, zone) => count + zone.querySelectorAll(".weather-symbol").length, 0);
  if (assigned >= weatherSymbols.length) {
    rankingStatus.textContent = "Je hebt jouw volgorde compleet gemaakt.";
    celebrate();
  } else {
    rankingStatus.textContent = `${assigned} van ${weatherSymbols.length} symbolen geplaatst.`;
  }
}

function placeWeatherInZone(symbol, zone) {
  if (symbol.classList.contains("is-placed")) {
    zone.append(symbol);
    symbol.classList.remove("is-dragging");
    draggedWeather = null;
    checkWeatherComplete();
    return;
  }
  const placed = symbol.cloneNode(true);
  placed.classList.remove("is-used");
  placed.classList.add("is-placed");
  placed.setAttribute("draggable", "true");
  placed.setAttribute("aria-hidden", "true");
  setupPlacedSymbol(placed);
  zone.append(placed);
  symbol.remove();
  weatherSymbols.splice(weatherSymbols.indexOf(symbol), 1);
  checkWeatherComplete();
}

function setupPlacedSymbol(symbol) {
  symbol.addEventListener("dragstart", (event) => {
    draggedWeather = symbol;
    event.dataTransfer.effectAllowed = "move";
  });
  symbol.addEventListener("click", (event) => {
    event.stopPropagation();
    draggedWeather = symbol;
    rankingStatus.textContent = "Verplaats dit symbool naar een ander vak.";
  });
}

weatherSymbols.forEach((symbol) => {
  symbol.addEventListener("dragstart", (event) => {
    draggedWeather = symbol;
    event.dataTransfer.effectAllowed = "move";
  });
  symbol.addEventListener("click", () => {
    if (symbol.classList.contains("is-used")) return;
    draggedWeather = symbol;
    rankingStatus.textContent = "Kies nu een van de vier vakjes.";
  });
});

weatherZones.forEach((zone) => {
  zone.addEventListener("dragover", (event) => {
    event.preventEvent?.();
    event.preventDefault();
    zone.classList.add("is-over");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("is-over"));
  zone.addEventListener("click", () => {
    if (!draggedWeather) return;
    placeWeatherInZone(draggedWeather, zone);
    draggedWeather = null;
  });
  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("is-over");
    if (!draggedWeather) return;
    placeWeatherInZone(draggedWeather, zone);
    draggedWeather = null;
  });
});

const weatherReset = document.querySelector(".weather-reset");
if (weatherReset) {
  weatherReset.addEventListener("click", () => {
    draggedWeather = null;
    location.reload();
  });
}

const editionTwo = document.querySelector("#edition-2");
const imageCards = [...editionTwo.querySelectorAll(".image-card")];
let draggedImage = null;

imageCards.forEach((card) => {
  card.addEventListener("click", (event) => {
    if (draggedImage) return;
    const alreadyFocused = card.classList.contains("is-focused");
    imageCards.forEach((other) => other.classList.remove("is-focused"));
    if (!alreadyFocused) card.classList.add("is-focused");
  });

  card.addEventListener("dragstart", (event) => {
    draggedImage = card;
    card.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("is-dragging");
    window.setTimeout(() => { draggedImage = null; }, 100);
  });

  card.addEventListener("dragover", (event) => event.preventDefault());

  card.addEventListener("drop", (event) => {
    event.preventDefault();
    if (!draggedImage || draggedImage === card) return;
    const field = card.parentElement;
    const draggedIndex = [...field.children].indexOf(draggedImage);
    const targetIndex = [...field.children].indexOf(card);
    if (draggedIndex < targetIndex) {
      field.insertBefore(draggedImage, card.nextElementSibling);
    } else {
      field.insertBefore(draggedImage, card);
    }
  });
});

// Edition 3: a calm, desktop drawing surface and a touch version on mobile.
function setupLightCanvas(canvas) {
  if (!canvas) return;
  const context = canvas.getContext("2d");
  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    context.scale(devicePixelRatio, devicePixelRatio);
  }
  resize();
  window.addEventListener("resize", resize);
  let drawing = false;
  function paint(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const gradient = context.createRadialGradient(x, y, 2, x, y, 42);
    gradient.addColorStop(0, "rgba(255, 246, 185, .82)");
    gradient.addColorStop(.45, "rgba(255, 220, 120, .42)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, 42, 0, Math.PI * 2);
    context.fill();
  }
  canvas.addEventListener("pointerdown", (event) => { drawing = true; canvas.setPointerCapture(event.pointerId); paint(event); });
  canvas.addEventListener("pointermove", (event) => { if (drawing) paint(event); });
  canvas.addEventListener("pointerup", () => { drawing = false; });
}

setupLightCanvas(document.querySelector(".edition-three-canvas"));
setupLightCanvas(document.querySelector(".edition-three-mobile-canvas"));

// Edition 5: map vertical scroll from 0:00 to 24:00.
const dayScroll = document.querySelector(".day-scroll");
const editionFive = document.querySelector("#edition-5");
const rainLayer = document.querySelector(".rain-layer");

if (rainLayer) {
  for (let index = 0; index < 72; index += 1) {
    const drop = document.createElement("i");
    drop.className = "rain-drop";
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.setProperty("--rain-height", `${32 + Math.random() * 48}px`);
    drop.style.setProperty("--rain-duration", `${0.65 + Math.random() * 0.75}s`);
    drop.style.setProperty("--rain-delay", `${-Math.random() * 1.4}s`);
    rainLayer.append(drop);
  }
}

function updateDayClock() {
  const max = Math.max(1, dayScroll.scrollHeight - dayScroll.clientHeight);
  const progress = Math.max(0, Math.min(1, dayScroll.scrollTop / max));
  const totalMinutes = Math.round(progress * 24 * 60);
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  const timeValue = document.querySelector(".time-value");
  timeValue.textContent = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const minuteAngle = minute * 6;
  document.querySelector(".hour-hand").style.transform = `rotate(${hourAngle}deg)`;
  document.querySelector(".minute-hand").style.transform = `rotate(${minuteAngle}deg)`;

  const isNight = hour < 8 || hour >= 20;
  editionFive.classList.toggle("is-night", isNight);
  editionFive.classList.toggle("is-raining", hour >= 10 && hour <= 18);

  let eventText;
  if (hour < 5) eventText = "De hemel is diep donker. Verre wolken verdwijnen in de nacht.";
  else if (hour < 8) eventText = "Het eerste licht trekt over de horizon. De wolken worden zichtbaar.";
  else if (hour < 12) eventText = "De lucht klaart op. Kleine wolken drijven over het blauwe plein.";
  else if (hour < 16) eventText = "Middagzon: lange schaduwen liggen tussen witte stapelwolken.";
  else if (hour < 20) eventText = "De lucht wordt warmer van kleur. Wolken verzamelen zich aan de horizon.";
  else eventText = "Het laatste licht valt weg. De dag wordt stil en donker.";
  document.querySelector(".weather-event").textContent = eventText;
  document.querySelector(".day-progress").innerHTML = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} <span aria-hidden="true">↓</span>`;
}

dayScroll.addEventListener("scroll", updateDayClock, { passive: true });
updateDayClock();

