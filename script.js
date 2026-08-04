document.addEventListener("DOMContentLoaded", () => {
  // --- State ---
  let currentMode = 10; // Default to 10 cards
  let selectedCards = []; // Array of card objects {cardData, isReversed, element}
  let deck = [...TAROT_DATA]; // Copy of data
  let lastReadingMessages = null; // { system, user } de la última tirada generada

  // --- LLM (llm7.io) config ---
  const LLM_API_URL = "https://api.llm7.io/v1/chat/completions";
  const LLM_KEY_STORAGE = "llm7_api_key";
  // Modelos gratuitos (usage_based_only:false) en llm7.io al 2026-08-04
  const FREE_MODELS = [
    "gpt-oss:20b",
    "deepseek-v4-flash:0731",
    "codestral-latest",
    "minimax-2.7",
    "mistral-Nemo-Instruct-2407",
    "gemini-3.1-flash-lite",
  ];

  const TAROT_SYSTEM_PROMPT = `Eres un tarotista de renombre, experto en interpretación simbólica, hermetismo y en la baraja Rider-Waite-Smith. Combinas precisión técnica con un lenguaje claro, cálido y empático.

Directrices de estilo:
- Responde SIEMPRE en el idioma en el que se te formula la pregunta.
- Afirma únicamente lo que la carta SÍ significa; nunca uses la fórmula "no es X, sino Y".
- Sé empático pero objetivo, equilibrando realismo y esperanza.
- Reconoce tanto las fortalezas como los desafíos; evita predicciones absolutas salvo que la tirada sea muy evidente.
- Indica con claridad si la lectura resulta favorable, neutra o desfavorable para la pregunta.
- Estructura tu respuesta en Markdown, con encabezados (##) para cada sección y listas cuando aporten claridad.`;

  const READING_TASK = `Realiza una lectura de tarot detallada y completa usando EXCLUSIVAMENTE las cartas anteriores, respetando su orden, posición y orientación. Estructura tu respuesta en las siguientes secciones:

## 1. Análisis individual de cada carta
Para cada carta, en orden:
- Explica su significado tradicional según su orientación (derecha o invertida).
- Interpreta qué aporta en su posición específica dentro de esta tirada.
- Relaciónala con el contexto de la consulta y el área de la vida que representa.
- Apóyate en la descripción visual proporcionada (símbolos, colores, figuras) para enriquecer el significado.

## 2. Conexiones y sinergia visual
- Analiza cómo dialogan los símbolos visuales entre las cartas (colores, posturas, miradas, direcciones, elementos repetidos).
- Identifica patrones, refuerzos o tensiones entre las imágenes.
- Construye una narrativa visual coherente que hile toda la tirada.

## 3. Interpretación profunda y mensajes ocultos
- Extrae el mensaje central del conjunto.
- Revela lecciones, advertencias u oportunidades no evidentes.
- Contextualiza la lectura en términos de pasado, presente y futuro según la tirada.

## 4. Consejos prácticos y camino a seguir
- Ofrece orientación concreta y accionable.
- Sugiere áreas de enfoque o cambios recomendados.
- Propón cómo superar los obstáculos identificados.

## 5. Conclusión y mantra de poder
- Resume la esencia de la lectura en unas frases integradoras.
- Señala con claridad si la tirada es favorable o desfavorable para la consulta.
- Crea un MANTRA o AFIRMACIÓN personalizada, en primera persona, que sintetice la energía de la tirada.
- Cierra con una reflexión empoderadora.

Antes de finalizar, presenta un breve resumen claro de la lectura realizada.`;

  // --- DOM Elements ---
  const gridEl = document.getElementById("grid");
  const btnShuffle = document.getElementById("btn-shuffle");
  const cardCountEl = document.getElementById("card-count");
  const toggleNamesEl = document.getElementById("toggle-names");
  const btnTheme = document.getElementById("btn-theme");

  // --- Initialization ---
  init();

  function init() {
    renderGrid();
    updateStatus();

    // Event Listeners
    btnShuffle.addEventListener("click", () => {
      shuffleDeck();
    });

    const modeLargeButtons = document.querySelectorAll(".btn-mode-large");
    modeLargeButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        startReading(parseInt(e.currentTarget.dataset.mode));
      });
    });

    const btnContinue = document.getElementById("btn-continue");
    if (btnContinue) {
      btnContinue.addEventListener("click", () => {
        document.getElementById("question-screen").classList.add("hidden");
        document.getElementById("workspace").classList.remove("hidden");
        document.getElementById("user-context").value =
          document.getElementById("pre-user-context").value;
        shuffleDeck();
      });
    }

    const btnRestart = document.getElementById("btn-restart");
    if (btnRestart) {
      btnRestart.addEventListener("click", restartAll);
    }

    toggleNamesEl.addEventListener("change", (e) => {
      const names = document.querySelectorAll(".card-name");
      names.forEach((el) => {
        if (e.target.checked) el.classList.remove("hidden-name");
        else el.classList.add("hidden-name");
      });
    });

    btnTheme.addEventListener("click", () => {
      document.body.classList.toggle("light-theme");
      btnTheme.textContent = document.body.classList.contains("light-theme")
        ? "☀️"
        : "🌙";
    });

    // Prompt Logic
    document.getElementById("btn-generate").addEventListener("click", () => {
      generatePrompt();
      showReadingScreen();
    });
    document
      .getElementById("btn-generate-again")
      .addEventListener("click", generatePrompt);
    document.getElementById("btn-copy").addEventListener("click", copyPrompt);

    // Random Selection
    document
      .getElementById("btn-random")
      .addEventListener("click", selectRandomCards);

    // Navegación de la pantalla de lectura
    document
      .getElementById("btn-back-cards")
      .addEventListener("click", showCards);
    document
      .getElementById("btn-restart-reading")
      .addEventListener("click", restartAll);

    // API config y consulta al oráculo
    initApiConfig();
    document
      .getElementById("btn-consult")
      .addEventListener("click", consultOracle);
    document
      .getElementById("btn-copy-reading")
      .addEventListener("click", copyReading);
  }

  // --- Core Logic ---

  function selectRandomCards() {
    // Deselect current
    deselectAll();

    const allCards = Array.from(document.getElementById("grid").children);
    const needed = currentMode;

    // Barajar índices y tomar los primeros 'needed' como selección única
    const indices = fisherYatesShuffle(
      Array.from({ length: allCards.length }, (_, i) => i),
    );

    // Take the first 'needed' indices
    const selectedIndices = indices.slice(0, needed);

    // Select them with a small visual delay
    selectedIndices.forEach((index, i) => {
      setTimeout(() => {
        const cardContainer = allCards[index];
        // Simulate click to trigger standard selection logic (validation, visual updates)
        if (cardContainer) cardContainer.click();
      }, i * 150); // 150ms delay between each pick
    });
  }

  function startReading(mode) {
    currentMode = mode;
    deselectAll();
    updateStatus();

    // Hide selection screen, show question screen
    document.getElementById("selection-screen").classList.add("hidden");
    document.getElementById("question-screen").classList.remove("hidden");
  }

  function updateStatus() {
    cardCountEl.textContent = `Seleccionadas: ${selectedCards.length} / ${currentMode}`;

    // Show/Hide generate button based on completion
    const btnGenerate = document.getElementById("btn-generate");
    const outputContainer = document.querySelector(".prompt-output-container");

    if (selectedCards.length === currentMode) {
      btnGenerate.classList.remove("hidden");
    } else {
      btnGenerate.classList.add("hidden");
      outputContainer.classList.add("hidden");
      const btnConsult = document.getElementById("btn-consult");
      if (btnConsult) btnConsult.classList.add("hidden");
    }
  }

  // Baraja Fisher-Yates; 'passes' repite el barajado para imitar mezclar físicamente varias veces
  function fisherYatesShuffle(array, passes = 1) {
    for (let p = 0; p < passes; p++) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    }
    return array;
  }

  function shuffleDeck() {
    if (gridEl.classList.contains("shuffling")) return; // Prevent double shuffle

    // Add shuffling class
    gridEl.classList.add("shuffling");

    // Optional: Add random offsets for the "gather" animation
    const cards = gridEl.querySelectorAll(".card-container");
    const centerX = gridEl.offsetWidth / 2;
    const centerY = gridEl.offsetHeight / 2;

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const gridRect = gridEl.getBoundingClientRect();

      // Calculate vector to center
      const dx = gridRect.left + centerX - (rect.left + rect.width / 2);
      const dy = gridRect.top + centerY - (rect.top + rect.height / 2);

      card.style.setProperty("--move-x", `${dx}px`);
      card.style.setProperty("--move-y", `${dy}px`);
    });

    // Delay the actual shuffle to show animation
    setTimeout(() => {
      // Shuffle the deck array
      deck = fisherYatesShuffle([...TAROT_DATA], 5);

      // Re-render grid
      deselectAll();
      renderGrid();

      // Remove shuffling class
      gridEl.classList.remove("shuffling");

      // Reset custom properties
      cards.forEach((card) => {
        card.style.removeProperty("--move-x");
        card.style.removeProperty("--move-y");
      });
    }, 800); // Match CSS animation duration
  }

  function renderGrid() {
    gridEl.innerHTML = "";

    deck.forEach((cardData) => {
      const cardContainer = document.createElement("div");
      cardContainer.className = "card-container";

      // Orientación aleatoria de la carta sobre la mesa (normal/reversa)
      const isReversed = Math.random() < 0.5;

      const card = document.createElement("div");
      card.className = `card ${isReversed ? "reversed" : ""}`;

      // Cartas boca abajo (dorso); se voltean al seleccionarlas
      card.innerHTML = `
                <div class="card-face card-back"></div>
                <div class="card-face card-front">
                    <img src="${cardData.img}" alt="${cardData.name_es}">
                    <div class="position-indicator text-xs absolute top-1 right-1 bg-black text-white px-1 rounded">${isReversed ? "REV" : "UP"}</div>
                </div>
            `;

      const nameEl = document.createElement("div");
      nameEl.className = "card-name";
      if (!toggleNamesEl.checked) nameEl.classList.add("hidden-name");
      nameEl.textContent = cardData.name_es;

      cardContainer.appendChild(card);
      cardContainer.appendChild(nameEl);

      // Click Event
      cardContainer.addEventListener("click", () => {
        toggleSelection(cardContainer, card, cardData, isReversed);
      });

      // Double Click for Modal
      cardContainer.addEventListener("dblclick", (e) => {
        e.stopPropagation(); // Prevent selection toggle jitter if possible
        showModal(cardData);
      });

      gridEl.appendChild(cardContainer);
    });
  }

  function deselectAll() {
    selectedCards = [];
    document.querySelectorAll(".card.selected").forEach((el) => {
      el.classList.remove("selected");
      el.classList.remove("flipped"); // Reset flip on new game
    });
    updateStatus();
  }

  function toggleSelection(container, cardEl, cardData, isReversed) {
    const isSelected = cardEl.classList.contains("selected");

    if (isSelected) {
      // Deselect
      cardEl.classList.remove("selected");
      cardEl.classList.remove("flipped");
      selectedCards = selectedCards.filter(
        (c) => c.cardData.id !== cardData.id,
      );
    } else {
      // Check limit
      if (selectedCards.length >= currentMode) {
        alert(`Máximo ${currentMode} cartas permitidas en este modo.`);
        return;
      }
      // Select
      cardEl.classList.add("selected");
      cardEl.classList.add("flipped"); // Reveal on selection
      selectedCards.push({ cardData, isReversed });
    }
    updateStatus();
  }

  // --- Prompt Generation ---

  function generatePrompt() {
    if (selectedCards.length === 0) {
      alert("Por favor selecciona al menos una carta.");
      return;
    }

    const context = document.getElementById("user-context").value;
    const output = document.getElementById("prompt-output");
    const outputContainer = document.querySelector(".prompt-output-container");

    lastReadingMessages = buildReadingMessages(context);

    output.value =
      `[INSTRUCCIONES DEL SISTEMA]\n${lastReadingMessages.system}\n\n` +
      `[MENSAJE DEL USUARIO]\n${lastReadingMessages.user}`;
    outputContainer.classList.remove("hidden");

    const consultBtn = document.getElementById("btn-consult");
    if (consultBtn) consultBtn.classList.remove("hidden");
  }

  function buildReadingMessages(context) {
    const modeDescriptions = {
      1: "lectura del día",
      3: "pasado, presente y futuro",
      10: "cruz celta",
      13: "rueda astrológica",
    };
    const description = modeDescriptions[currentMode] || "";

    // Definiciones de posiciones para cada tirada
    const spreadPositions = {
      1: ["Carta del día / Situación actual"],
      3: ["Pasado", "Presente", "Futuro"],
      10: [
        "Situación presente",
        "El Desafío (cruzada)",
        "El Pasado / Base",
        "El Pasado Reciente",
        "El potencial consiente / Metas",
        "El Futuro Inmediato",
        "Factores Internos / Actitud del consultante",
        "Factores Externos / Influencias ambientales",
        "Esperanzas y Temores",
        "Resultado Final / Desenlace",
      ],
      13: [
        "Casa 1 (Identidad / Personalidad)",
        "Casa 2 (Recursos / Valores)",
        "Casa 3 (Comunicación / Entorno cercano)",
        "Casa 4 (Hogar / Raíces)",
        "Casa 5 (Creatividad / Placer)",
        "Casa 6 (Salud / Trabajo diario)",
        "Casa 7 (Relaciones / Asociaciones)",
        "Casa 8 (Transformación / Bienes compartidos)",
        "Casa 9 (Filosofía / Viajes / Expansión)",
        "Casa 10 (Carrera / Proyección social)",
        "Casa 11 (Amigos / Proyectos grupales)",
        "Casa 12 (Inconsciente / Karma)",
        "Centro (Tema Central / Síntesis)",
      ],
    };
    const currentPositions = spreadPositions[currentMode] || [];

    let user = `CONSULTA DE TAROT\n\n`;
    user += `Tipo de lectura: ${currentMode} cartas${description ? ` (${description})` : ""}\n`;
    user += context.trim()
      ? `Contexto de la consulta: ${context.trim()}\n`
      : `Contexto de la consulta: Sin contexto específico.\n`;

    user += `\nCartas seleccionadas en el orden de la lectura:\n`;

    selectedCards.forEach((item, index) => {
      const orientation = item.isReversed
        ? "Invertida (Reversa)"
        : "Derecha (Normal)";
      const keywords = item.isReversed
        ? item.cardData.keywords_rev
        : item.cardData.keywords_up;
      const positionDesc =
        currentPositions.length > index
          ? currentPositions[index]
          : `Posición ${index + 1}`;

      user += `\n${index + 1}. ${item.cardData.name_es} (${item.cardData.name_en}) — ${orientation}\n`;
      user += `   • Posición en la tirada: ${positionDesc}\n`;
      user += `   • Palabras clave (${item.isReversed ? "invertida" : "derecha"}): ${keywords}\n`;
      if (item.cardData.img_desc) {
        user += `   • Imagen de la carta: ${item.cardData.img_desc}\n`;
      }
    });

    user += `\n${READING_TASK}`;

    return { system: TAROT_SYSTEM_PROMPT, user };
  }


  function copyPrompt() {
    const output = document.getElementById("prompt-output");
    copyText(output.value, document.getElementById("btn-copy"));
  }

  function copyReading() {
    const output = document.getElementById("oracle-output");
    copyText(output.dataset.raw || output.textContent, this);
  }

  async function copyText(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Fallback para navegadores sin Clipboard API o contextos no seguros
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    if (!btn) return;
    const originalText = btn.textContent;
    btn.textContent = "¡Copiado!";
    btn.style.backgroundColor = "#27ae60";
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.backgroundColor = "";
    }, 2000);
  }

  // --- Configuración de la API (llm7.io) ---

  function initApiConfig() {
    const select = document.getElementById("model-select");
    FREE_MODELS.forEach((model) => {
      const opt = document.createElement("option");
      opt.value = model;
      opt.textContent = model;
      select.appendChild(opt);
    });

    const savedModel = localStorage.getItem("llm7_model");
    if (savedModel && FREE_MODELS.includes(savedModel)) {
      select.value = savedModel;
    }
    select.addEventListener("change", () => {
      localStorage.setItem("llm7_model", select.value);
    });

    const keyInput = document.getElementById("api-key-input");
    const savedKey = localStorage.getItem(LLM_KEY_STORAGE);
    if (savedKey) {
      keyInput.value = savedKey;
      setApiStatus("Clave guardada ✓", "ok");
    }

    document.getElementById("btn-api-toggle").addEventListener("click", () => {
      document.getElementById("api-panel").classList.toggle("is-hidden");
    });

    document.getElementById("btn-save-key").addEventListener("click", () => {
      const value = keyInput.value.trim();
      if (!value) {
        localStorage.removeItem(LLM_KEY_STORAGE);
        setApiStatus("Clave eliminada.", "warn");
        return;
      }
      localStorage.setItem(LLM_KEY_STORAGE, value);
      setApiStatus("Clave guardada ✓", "ok");
    });
  }

  function setApiStatus(message, kind) {
    const el = document.getElementById("api-status");
    el.textContent = message;
    el.className = "api-status" + (kind ? ` ${kind}` : "");
  }

  function getApiKey() {
    return localStorage.getItem(LLM_KEY_STORAGE) || "";
  }

  // --- Consulta al LLM ---

  async function consultOracle() {
    if (!lastReadingMessages) {
      alert("Primero genera el prompt de la tirada.");
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      setApiStatus("Introduce y guarda tu API key primero.", "warn");
      document.getElementById("api-panel").classList.remove("is-hidden");
      document.getElementById("api-key-input").focus();
      return;
    }

    const model = document.getElementById("model-select").value;
    const section = document.getElementById("oracle-section");
    const loading = document.getElementById("oracle-loading");
    const outputEl = document.getElementById("oracle-output");
    const consultBtn = document.getElementById("btn-consult");

    section.classList.remove("is-hidden");
    loading.classList.remove("is-hidden");
    outputEl.innerHTML = "";
    consultBtn.disabled = true;
    section.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      const response = await fetch(LLM_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: lastReadingMessages.system },
            { role: "user", content: lastReadingMessages.user },
          ],
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(await describeHttpError(response));
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("El modelo no devolvió ninguna interpretación.");
      }

      outputEl.dataset.raw = content;
      outputEl.innerHTML = renderMarkdown(content);
    } catch (err) {
      outputEl.dataset.raw = "";
      outputEl.innerHTML = `<p class="oracle-error">⚠️ ${escapeHtml(err.message)}</p>`;
    } finally {
      loading.classList.add("is-hidden");
      consultBtn.disabled = false;
    }
  }

  async function describeHttpError(response) {
    let detail = "";
    try {
      const data = await response.json();
      detail = data?.error?.message || data?.message || "";
    } catch (e) {
      /* respuesta sin cuerpo JSON */
    }
    if (response.status === 401)
      return "API key inválida o no autorizada (401). Revisa tu clave.";
    if (response.status === 429)
      return "Límite de peticiones alcanzado (429). Espera un momento e inténtalo de nuevo.";
    return `Error ${response.status}${detail ? `: ${detail}` : ""}`;
  }

  function resetOracle() {
    lastReadingMessages = null;
    const section = document.getElementById("oracle-section");
    const outputEl = document.getElementById("oracle-output");
    section.classList.add("is-hidden");
    outputEl.innerHTML = "";
    outputEl.dataset.raw = "";
    document.getElementById("btn-consult").classList.add("hidden");
  }

  function showReadingScreen() {
    document.getElementById("workspace").classList.add("hidden");
    document.getElementById("reading-screen").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showCards() {
    document.getElementById("reading-screen").classList.add("hidden");
    document.getElementById("workspace").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restartAll() {
    document.getElementById("workspace").classList.add("hidden");
    document.getElementById("reading-screen").classList.add("hidden");
    document.getElementById("question-screen").classList.add("hidden");
    document.getElementById("selection-screen").classList.remove("hidden");
    deselectAll();
    document.querySelector(".prompt-output-container").classList.add("hidden");
    document.getElementById("prompt-output").value = "";
    document.getElementById("user-context").value = "";
    document.getElementById("pre-user-context").value = "";
    resetOracle();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // --- Render seguro de Markdown básico (escapa HTML para evitar XSS) ---

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderInline(text) {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>");
  }

  function renderMarkdown(md) {
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    let html = "";
    let listOpen = false;

    const closeList = () => {
      if (listOpen) {
        html += "</ul>";
        listOpen = false;
      }
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        closeList();
        return;
      }

      const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
      if (heading) {
        closeList();
        const level = heading[1].length;
        html += `<h${level}>${renderInline(heading[2])}</h${level}>`;
        return;
      }

      const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
      if (bullet) {
        if (!listOpen) {
          html += "<ul>";
          listOpen = true;
        }
        html += `<li>${renderInline(bullet[1])}</li>`;
        return;
      }

      closeList();
      html += `<p>${renderInline(trimmed)}</p>`;
    });

    closeList();
    return html;
  }


  // --- Modal ---
  const modal = document.getElementById("card-modal");
  const closeModal = document.querySelector(".close-modal");

  closeModal.onclick = function () {
    modal.style.display = "none";
  };

  window.onclick = function (event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };

  function showModal(data) {
    document.getElementById("modal-title").textContent =
      data.name_es + " / " + data.name_en;
    document.getElementById("modal-type").textContent =
      data.type === "major"
        ? "Arcano Mayor"
        : `Arcano Menor - ${capitalize(data.suit)}`;
    document.getElementById("modal-keywords-up").textContent = data.keywords_up;
    document.getElementById("modal-keywords-rev").textContent =
      data.keywords_rev;
    document.getElementById("modal-img").src = data.img;

    modal.style.display = "block";
  }

  function capitalize(s) {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
});
