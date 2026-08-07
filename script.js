document.addEventListener("DOMContentLoaded", () => {
  // --- State ---
  let currentMode = "10-celtic"; // Tirada por defecto
  let currentModeDesc = ""; // Texto de mode-desc seleccionado en UI
  let selectedCards = []; // Array of card objects {cardData, isReversed, element}
  let deck = [...TAROT_DATA]; // Copy of data
  let lastReadingMessages = null; // { system, user } de la última tirada generada
  let followUpHistory = []; // Historial conversacional para preguntas de seguimiento

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

  const READING_TASK = `Realiza una lectura de tarot detallada, profunda y completa usando EXCLUSIVAMENTE las cartas anteriores, respetando su orden, posición y orientación. Estructura tu respuesta en las siguientes secciones:

## 1. ANÁLISIS CARTA POR CARTA
Para cada carta, en orden:
- Explica su significado literal y simbólico según su orientación (derecha o invertida).
- Indica su posición e influencia dentro del conjunto.
- Relaciónala con el contexto de la consulta y el área de vida implicada.

## 2. DIÁLOGO ENTRE LAS CARTAS
- Describe las relaciones temáticas y narrativas entre las cartas.
- Señala símbolos repetidos, complementarios o en contraste.
- Explica la tensión o armonía entre elementos (fuego, agua, aire, tierra).

## 3. NIVELES DE INTERPRETACIÓN
- Nivel práctico: ¿Qué muestra en lo concreto y observable?
- Nivel psicológico: ¿Qué revela sobre dinámicas internas, emociones o bloqueos?
- Nivel espiritual/arquetípico: ¿Qué patrones mayores o lecciones de fondo activa?

## 4. CONEXIONES OCULTAS
- Incluye numerología relevante de las cartas seleccionadas.
- Añade correspondencias astrológicas o alquímicas cuando aporten claridad.
- Señala posibles referencias históricas, míticas o tradicionales pertinentes.

## 5. MENSAJE CENTRAL
- Entrega la síntesis en frases poderosas y claras.
- Expresa lo que no se dice de forma literal pero se intuye en la tirada.
- Indica con claridad si la lectura es favorable, neutra o desfavorable para la consulta.

## 6. CAMINO RECOMENDADO
- Propón una acción práctica inmediata y realista.
- Sugiere un trabajo interno (actitud, hábito, reflexión o enfoque emocional).
- Indica señales concretas a observar en el entorno para validar el proceso.

## 7. PREGUNTAS PARA PROFUNDIZAR
- Formula preguntas reflexivas para el consultante.
- Incluye un ángulo no obvio que merezca exploración adicional.

Cierra con una breve conclusión integradora y un MANTRA o AFIRMACIÓN personalizada, en primera persona, coherente con toda la lectura.`;

  const SPREAD_MODES = {
    "1-day": {
      cardCount: 1,
      label: "1 carta",
      description: "lectura del día",
      positions: ["Carta del día / Situación actual"],
    },
    "3-ppf": {
      cardCount: 3,
      label: "3 cartas",
      description: "pasado, presente y futuro",
      positions: ["Pasado", "Presente", "Futuro"],
    },
    "10-celtic": {
      cardCount: 10,
      label: "10 cartas",
      description: "cruz celta",
      positions: [
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
    },
    "13-astro": {
      cardCount: 13,
      label: "13 cartas",
      description: "rueda astrológica",
      positions: [
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
    },
    "13-mystic": {
      cardCount: 13,
      label: "13 cartas",
      description: "cruz mística",
      positions: [
        "Vertical (Situación actual) - Carta 1 (Arriba): Aspectos superiores o ideales",
        "Vertical (Situación actual) - Carta 2: Influencias internas o personales",
        "Vertical (Situación actual) - Carta 3: Base o fundamento de la situación",
        "Vertical (Situación actual) - Carta 4 (Centro): Factor central de la consulta",
        "Vertical (Situación actual) - Carta 5 (Abajo): Resultado inmediato o consecuencia directa",
        "Vertical (Situación actual) - Carta 6: Influencia del entorno cercano o apoyo",
        "Vertical (Situación actual) - Carta 7: Aspectos ocultos o subconscientes",
        "Horizontal (Influencias externas) - Carta 8 (Izquierda): Influencia externa positiva",
        "Horizontal (Influencias externas) - Carta 9: Influencia externa negativa u obstáculo",
        "Horizontal (Influencias externas) - Carta 10 (Derecha): Resultado final externo",
        "Horizontal (Influencias externas) - Carta 11: Matiz adicional y desarrollo temporal",
        "Horizontal (Influencias externas) - Carta 12: Matiz adicional y desarrollo temporal",
        "Horizontal (Influencias externas) - Carta 13: Matiz adicional y desarrollo temporal",
      ],
      guidance:
        "Incluye interpretación del significador: si aparece en la hilera vertical, el consultante está más a merced de los acontecimientos; si aparece en la horizontal, muestra mayor control de la situación.",
    },
  };

  function getCurrentSpread() {
    return SPREAD_MODES[currentMode] || SPREAD_MODES["10-celtic"];
  }

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
        const modeDescEl = e.currentTarget.querySelector(".mode-desc");
        const modeDesc = modeDescEl ? modeDescEl.textContent.trim() : "";
        startReading(e.currentTarget.dataset.mode, modeDesc);
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
    document
      .getElementById("btn-followup")
      .addEventListener("click", askFollowUp);
  }

  // --- Core Logic ---

  function selectRandomCards() {
    // Deselect current
    deselectAll();

    const allCards = Array.from(document.getElementById("grid").children);
    const needed = getCurrentSpread().cardCount;

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

  function startReading(mode, modeDesc = "") {
    if (!SPREAD_MODES[mode]) return;
    currentMode = mode;
    currentModeDesc = modeDesc;
    deselectAll();
    updateStatus();

    // Hide selection screen, show question screen
    document.getElementById("selection-screen").classList.add("hidden");
    document.getElementById("question-screen").classList.remove("hidden");
  }

  function updateStatus() {
    const needed = getCurrentSpread().cardCount;
    cardCountEl.textContent = `Seleccionadas: ${selectedCards.length} / ${needed}`;

    // Show/Hide generate button based on completion
    const btnGenerate = document.getElementById("btn-generate");
    const outputContainer = document.querySelector(".prompt-output-container");

    if (selectedCards.length === needed) {
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
      const needed = getCurrentSpread().cardCount;
      if (selectedCards.length >= needed) {
        alert(`Máximo ${needed} cartas permitidas en este modo.`);
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
    const spread = getCurrentSpread();
    const description = currentModeDesc || spread.description || "";
    const currentPositions = spread.positions || [];

    let user = `CONSULTA DE TAROT\n\n`;
    user += `Tipo de lectura: ${spread.label}${description ? ` (${description})` : ""}\n`;
    if (currentModeDesc) {
      user += `Descripción de la tirada (mode-desc UI): ${currentModeDesc}\n`;
    }
    user += context.trim()
      ? `Contexto de la consulta: ${context.trim()}\n`
      : `Contexto de la consulta: Sin contexto específico.\n`;

    if (spread.guidance) {
      user += `Indicaciones de esta tirada: ${spread.guidance}\n`;
    }

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
      initFollowUpHistory(content);
      const followUpSection = document.getElementById("followup-section");
      followUpSection.classList.remove("is-hidden");
    } catch (err) {
      outputEl.dataset.raw = "";
      outputEl.innerHTML = `<p class="oracle-error">⚠️ ${escapeHtml(err.message)}</p>`;
      clearFollowUpState();
    } finally {
      loading.classList.add("is-hidden");
      consultBtn.disabled = false;
    }
  }

  async function askFollowUp() {
    if (!lastReadingMessages || followUpHistory.length === 0) {
      alert("Primero genera y consulta la lectura principal.");
      return;
    }

    const questionInput = document.getElementById("followup-input");
    const question = questionInput.value.trim();
    if (!question) {
      alert("Escribe una pregunta de seguimiento antes de enviar.");
      questionInput.focus();
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
    const followUpLoading = document.getElementById("followup-loading");
    const followUpBtn = document.getElementById("btn-followup");
    const userMessage = {
      role: "user",
      content: `Pregunta de seguimiento del consultante: ${question}`,
    };

    followUpHistory.push(userMessage);
    followUpLoading.classList.remove("is-hidden");
    followUpBtn.disabled = true;

    try {
      const response = await fetch(LLM_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: followUpHistory,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(await describeHttpError(response));
      }

      const data = await response.json();
      const answer = data?.choices?.[0]?.message?.content?.trim();
      if (!answer) {
        throw new Error("El modelo no devolvió respuesta a la pregunta de seguimiento.");
      }

      followUpHistory.push({ role: "assistant", content: answer });
      appendFollowUpExchange(question, answer);
      questionInput.value = "";
    } catch (err) {
      followUpHistory.pop();
      appendFollowUpError(question, err.message);
    } finally {
      followUpLoading.classList.add("is-hidden");
      followUpBtn.disabled = false;
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
    clearFollowUpState();
  }

  function initFollowUpHistory(oracleReadingText) {
    const followUpSystemPrompt = `${TAROT_SYSTEM_PROMPT}\n\nResponde preguntas de seguimiento sobre una lectura ya entregada. Mantén coherencia estricta con las cartas, su orientación y la lectura previa. Si algo no puede afirmarse con base en la tirada, dilo explícitamente.`;
    followUpHistory = [
      { role: "system", content: followUpSystemPrompt },
      { role: "user", content: lastReadingMessages.user },
      { role: "assistant", content: oracleReadingText },
    ];

    const followUpOutput = document.getElementById("followup-output");
    const followUpInput = document.getElementById("followup-input");
    followUpOutput.innerHTML = "";
    followUpInput.value = "";
  }

  function clearFollowUpState() {
    followUpHistory = [];
    const followUpSection = document.getElementById("followup-section");
    const followUpOutput = document.getElementById("followup-output");
    const followUpInput = document.getElementById("followup-input");
    const followUpLoading = document.getElementById("followup-loading");
    const followUpBtn = document.getElementById("btn-followup");

    followUpSection.classList.add("is-hidden");
    followUpOutput.innerHTML = "";
    followUpInput.value = "";
    followUpLoading.classList.add("is-hidden");
    followUpBtn.disabled = false;
  }

  function appendFollowUpExchange(question, answer) {
    const followUpOutput = document.getElementById("followup-output");
    const item = document.createElement("div");
    item.className = "followup-item";
    item.innerHTML = `
      <div class="followup-question"><strong>Tu pregunta:</strong> ${escapeHtml(question)}</div>
      <div class="followup-answer">${renderMarkdown(answer)}</div>
    `;
    followUpOutput.appendChild(item);
    followUpOutput.scrollTop = followUpOutput.scrollHeight;
  }

  function appendFollowUpError(question, message) {
    const followUpOutput = document.getElementById("followup-output");
    const item = document.createElement("div");
    item.className = "followup-item";
    item.innerHTML = `
      <div class="followup-question"><strong>Tu pregunta:</strong> ${escapeHtml(question)}</div>
      <div class="followup-answer oracle-error">⚠️ ${escapeHtml(message)}</div>
    `;
    followUpOutput.appendChild(item);
    followUpOutput.scrollTop = followUpOutput.scrollHeight;
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
