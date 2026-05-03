const pdfUrl = "./presentation.pdf";

const canvas = document.getElementById("pdf-canvas");
const ctx = canvas.getContext("2d");

const currentPageEl = document.getElementById("current-page");
const totalPagesEl = document.getElementById("total-pages");
const loadingEl = document.getElementById("loading");

let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let isRendering = false;
let pendingPage = null;

// Aynı dokunuş/tıklama kısa sürede tekrar gelirse engellemek için
let lastNavigationTime = 0;

canvas.style.display = "none";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

async function loadPdf() {
  try {
    loadingEl.textContent = "PDF yükleniyor...";

    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    pdfDoc = await loadingTask.promise;

    totalPages = pdfDoc.numPages;
    totalPagesEl.textContent = totalPages;

    loadingEl.style.display = "none";
    canvas.style.display = "block";

    renderPage(currentPage);
  } catch (error) {
    loadingEl.style.display = "block";
    loadingEl.textContent =
      "PDF yüklenemedi. Live Server ile açtığından ve PDF adının presentation.pdf olduğundan emin ol.";

    console.error("PDF yükleme hatası:", error);
  }
}

async function renderPage(pageNumber) {
  isRendering = true;

  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  const scaleX = screenWidth / viewport.width;
  const scaleY = screenHeight / viewport.height;

  const scale = Math.min(scaleX, scaleY);

  const scaledViewport = page.getViewport({ scale });

  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  await page.render({
    canvasContext: ctx,
    viewport: scaledViewport,
  }).promise;

  currentPageEl.textContent = currentPage;

  isRendering = false;

  if (pendingPage !== null) {
    const nextPageNumber = pendingPage;
    pendingPage = null;
    renderPage(nextPageNumber);
  }
}

function queueRenderPage(pageNumber) {
  if (isRendering) {
    pendingPage = pageNumber;
  } else {
    renderPage(pageNumber);
  }
}

function nextPage() {
  if (!pdfDoc || currentPage >= totalPages) return;

  currentPage++;
  queueRenderPage(currentPage);
}

function previousPage() {
  if (!pdfDoc || currentPage <= 1) return;

  currentPage--;
  queueRenderPage(currentPage);
}

function canNavigateNow() {
  const now = Date.now();

  if (now - lastNavigationTime < 350) {
    return false;
  }

  lastNavigationTime = now;
  return true;
}

function handleScreenNavigation(xPosition) {
  if (!canNavigateNow()) return;

  const screenMiddle = window.innerWidth / 2;

  if (xPosition < screenMiddle) {
    previousPage();
  } else {
    nextPage();
  }
}

// Klavye kontrolleri
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") {
    if (!canNavigateNow()) return;
    nextPage();
  }

  if (event.key === "ArrowLeft") {
    if (!canNavigateNow()) return;
    previousPage();
  }
});

// Mouse + mobil dokunma kontrolleri
document.addEventListener("pointerup", (event) => {
  // Mouse sağ click: geri
  if (event.pointerType === "mouse" && event.button === 2) {
    if (!canNavigateNow()) return;
    previousPage();
    return;
  }

  // Mouse sol click, mobil touch ve tablet kalem dokunuşu
  if (
    event.pointerType === "mouse" ||
    event.pointerType === "touch" ||
    event.pointerType === "pen"
  ) {
    handleScreenNavigation(event.clientX);
  }
});

// Sağ click menüsünü kapat
document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

// Mobilde çift dokunma zoom / ghost click davranışlarını azaltır
document.addEventListener(
  "touchend",
  (event) => {
    event.preventDefault();
  },
  { passive: false }
);

// Ekran boyutu veya yön değişirse mevcut sayfayı tekrar ölçekle
window.addEventListener("resize", () => {
  if (pdfDoc) {
    queueRenderPage(currentPage);
  }
});

window.addEventListener("orientationchange", () => {
  setTimeout(() => {
    if (pdfDoc) {
      queueRenderPage(currentPage);
    }
  }, 300);
});

loadPdf();