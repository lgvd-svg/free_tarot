document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentMode = 10; // Default to 10 cards
    let selectedCards = []; // Array of card objects {cardData, isReversed, element}
    let deck = [...TAROT_DATA]; // Copy of data

    // --- DOM Elements ---
    const gridEl = document.getElementById('grid');
    const btnShuffle = document.getElementById('btn-shuffle');
    const modeButtons = document.querySelectorAll('.btn-mode');
    const cardCountEl = document.getElementById('card-count');
    const toggleNamesEl = document.getElementById('toggle-names');
    const btnTheme = document.getElementById('btn-theme');

    // --- Initialization ---
    init();

    function init() {
        renderGrid();
        updateStatus();

        // Event Listeners
        btnShuffle.addEventListener('click', shuffleDeck);

        modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                setMode(parseInt(e.target.dataset.mode));
            });
        });

        toggleNamesEl.addEventListener('change', (e) => {
            const names = document.querySelectorAll('.card-name');
            names.forEach(el => {
                if (e.target.checked) el.classList.remove('hidden-name');
                else el.classList.add('hidden-name');
            });
        });

        btnTheme.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            btnTheme.textContent = document.body.classList.contains('light-theme') ? '☀️' : '🌙';
        });

        // Prompt Logic
        document.getElementById('btn-generate').addEventListener('click', generatePrompt);
        document.getElementById('btn-copy').addEventListener('click', copyPrompt);

        // Random Selection
        document.getElementById('btn-random').addEventListener('click', selectRandomCards);
    }

    // --- Core Logic ---

    function selectRandomCards() {
        // Deselect current
        deselectAll();

        const allCards = Array.from(document.getElementById('grid').children);
        const needed = currentMode;

        // Fisher-Yates shuffle logic on indices to pick unique random cards
        // We act on indices [0...length-1]
        const indices = Array.from({ length: allCards.length }, (_, i) => i);

        // Shuffle indices
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

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

    function setMode(mode) {
        currentMode = mode;
        // Reset selections when changing mode
        deselectAll();

        // Update UI
        modeButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.btn-mode[data-mode="${mode}"]`).classList.add('active');

        updateStatus();
    }

    function updateStatus() {
        cardCountEl.textContent = `Seleccionadas: ${selectedCards.length} / ${currentMode}`;
    }

    function fisherYatesShuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function shuffleDeck() {
        // Shuffle the deck array
        deck = fisherYatesShuffle([...TAROT_DATA]);

        // Re-render grid with animation feel
        // In a real DOM manipulation, re-rendering 78 divs is cheap enough
        deselectAll();
        renderGrid();
    }

    function renderGrid() {
        gridEl.innerHTML = '';

        deck.forEach(cardData => {
            const cardContainer = document.createElement('div');
            cardContainer.className = 'card-container';

            // Randomize reversed status for visuals
            // Let's decide: Is the card reversed *on the table* before picking? 
            // Yes, "Indicador visual de posición (normal/reversa)".

            const isReversed = Math.random() < 0.5;

            const card = document.createElement('div');
            card.className = `card ${isReversed ? 'reversed' : ''}`;

            // Front (Tarot Image) - In DOM terms this is the "Back" of the element if 3D flipped
            // But visually, the user sees the "Back of the card" (pattern) initially?
            // Wait, usually you pick from face down cards.
            // "Selección por clic individual... Resaltado visual"
            // "Representación visual: Imagen... Nombre... Indicador"
            // If they are face down, you can't see the image.
            // Assumption: Cards are Face Down (Pattern visible). Users pick them.
            // After picking, or perhaps for "Generation", they are revealed?
            // Re-reading: "Representación visual: Cada carta debe mostrar: Imagen... Nombre"
            // This might mean they are Face Up?
            // "Mezcla aleatoria... Asignación aleatoria de posición"
            // If they are Face Up from the start, "1, 3, 10, 13" selection implies picking specific ones.
            // Let's assume **Face Down** initially for a reading experience, revealing on specific UI action, 
            // OR Face Up if it's a study tool.
            // Given "Botón Generar Prompt", usually you pick Blindly.
            // BUT "Representación visual" requirement lists Image/Name. 
            // Let's go with: Cards are Face Down. Clicking Selects them. 

            // Refined Plan: 
            // Card has 3D flip.
            // Default: Face Down.
            // Click: Selects it (Highlight).
            // "Generar Prompt" reveals them? Or do they flip on specific interaction?

            // Also, seeing 78 cards is cool.

            // Middle Ground: Cards are Face Down (Back Pattern).
            // When selected, they flip Face Up to reveal what you got.

            card.innerHTML = `
                <div class="card-face card-back"></div>
                <div class="card-face card-front">
                    <img src="${cardData.img}" alt="${cardData.name_es}">
                    <div class="position-indicator text-xs absolute top-1 right-1 bg-black text-white px-1 rounded">${isReversed ? 'REV' : 'UP'}</div>
                </div>
            `;

            const nameEl = document.createElement('div');
            nameEl.className = 'card-name';
            if (!toggleNamesEl.checked) nameEl.classList.add('hidden-name');
            nameEl.textContent = cardData.name_es;

            cardContainer.appendChild(card);
            cardContainer.appendChild(nameEl);

            // Click Event
            cardContainer.addEventListener('click', () => {
                toggleSelection(cardContainer, card, cardData, isReversed);
            });

            // Double Click for Modal
            cardContainer.addEventListener('dblclick', (e) => {
                e.stopPropagation(); // Prevent selection toggle jitter if possible
                showModal(cardData);
            });

            gridEl.appendChild(cardContainer);
        });
    }

    function deselectAll() {
        selectedCards = [];
        document.querySelectorAll('.card.selected').forEach(el => {
            el.classList.remove('selected');
            el.classList.remove('flipped'); // Reset flip on new game
        });
        updateStatus();
    }

    function toggleSelection(container, cardEl, cardData, isReversed) {
        const isSelected = cardEl.classList.contains('selected');

        if (isSelected) {
            // Deselect
            cardEl.classList.remove('selected');
            cardEl.classList.remove('flipped');
            selectedCards = selectedCards.filter(c => c.cardData.id !== cardData.id);
        } else {
            // Check limit
            if (selectedCards.length >= currentMode) {
                alert(`Máximo ${currentMode} cartas permitidas en este modo.`);
                return;
            }
            // Select
            cardEl.classList.add('selected');
            cardEl.classList.add('flipped'); // Reveal on selection
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

        const context = document.getElementById('user-context').value;
        const output = document.getElementById('prompt-output');

        const modeDescriptions = {
            1: "lectura del día",
            3: "presente pasado y futuro",
            10: "cruz celta",
            13: "rueda astrológica"
        };
        const description = modeDescriptions[currentMode] || "";

        let prompt = `CONSULTA DE TAROT\n\n`;
        prompt += `Tipo de lectura: ${currentMode} cartas ${description ? `(${description})` : ''}\n`;

        if (context.trim()) {
            prompt += `Contexto de la consulta: ${context}\n`;
        } else {
            prompt += `Contexto de la consulta: Sin contexto específico.\n`;
        }

        prompt += `\nCartas seleccionadas en el orden de la lectura:\n`;

        // Definiciones de posiciones para cada tirada
        const spreadPositions = {
            1: ["Carta del día / Situación actual"],
            3: ["Pasado", "Presente", "Futuro"],
            10: [
                "1. Situación presente",
                "2. El Desafío (cruzada)",
                "3. El Pasado / Base",
                "4. El Pasado Reciente",
                "5. El Mejor Resultado Posible / Metas",
                "6. El Futuro Inmediato",
                "7. Factores Internos / Actitud del consultante",
                "8. Factores Externos / Influencias ambientales",
                "9. Esperanzas y Temores",
                "10. Resultado Final"
            ],
            13: [
                "1. Casa 1 (Identidad / Personalidad)",
                "2. Casa 2 (Recursos / Valores)",
                "3. Casa 3 (Comunicación / Entorno cercano)",
                "4. Casa 4 (Hogar / Raíces)",
                "5. Casa 5 (Creatividad / Placer)",
                "6. Casa 6 (Salud / Trabajo diario)",
                "7. Casa 7 (Relaciones / Asociaciones)",
                "8. Casa 8 (Transformación / Bienes compartidos)",
                "9. Casa 9 (Filosofía / Viajes / Expansión)",
                "10. Casa 10 (Carrera / Proyección social)",
                "11. Casa 11 (Amigos / Proyectos grupales)",
                "12. Casa 12 (Inconsciente / Karma)",
                "13. Centro (Tema Central / Síntesis)"
            ]
        };

        const currentPositions = spreadPositions[currentMode] || [];

        selectedCards.forEach((item, index) => {
            const pos = item.isReversed ? "Reversa" : "Normal";
            let positionDesc = "";

            if (currentPositions.length > index) {
                positionDesc = ` - ${currentPositions[index]}`;
            } else if (currentPositions.length > 0) {
                // Fallback if somehow more cards than positions (shouldn't happen with correct mode)
                positionDesc = ` - Posición ${index + 1}`;
            }

            prompt += `${index + 1}. ${item.cardData.name_es} (${pos})${positionDesc}\n`;
        });

        prompt += `\n
        Eres un tarotista increíblemente experto en interpretación simbólica y hermetismo.
        Tu estilo combina precisión técnica con sensibilidad intuitiva usando lenguaje claro.
        Realiza una lectura de tarot detallada con las cartas seleccionadas dadas 
        anteriormente respetando el orden y posición:
        1. ANÁLISIS INDIVIDUAL DE CADA CARTA:
            - Describe el significado tradicional de cada carta
            - Interpreta su posición y orientación en este contexto específico
            - Menciona qué aspectos de la vida representa cada carta
        2. CONEXIONES Y SINERGIA VISUAL:
            - Analiza cómo se relacionan los símbolos visuales entre las cartas (colores, posturas, miradas)
            - Identifica patrones gráficos comunes, contradicciones o refuerzos temáticos
            - Construye una narrativa visual cohesiva entre las imágenes
        3. INTERPRETACIÓN PROFUNDA Y MENSAJES OCULTOS:
            - Extrae el mensaje principal del conjunto
            - Revela lecciones, advertencias u oportunidades no evidentes
            - Contextualiza la lectura en términos de pasado, presente y futuro
        4. CONSEJOS PRÁCTICOS Y CAMINO A SEGUIR:
            - Proporciona orientación específica y accionable
            - Sugiere áreas de enfoque o cambios recomendados
            - Ofrece perspectivas para superar obstáculos identificados
        5. CONCLUSIÓN Y MANTRA DE PODER:
            - Resume la esencia de la lectura en una frase integradora
            - Crea un MANTRA o AFIRMACIÓN personalizada (en primera persona) que sintetice la energía de la tirada para el consultante
            - Termina con una reflexión empoderadora
        TONO Y ESTILO:
            - Sé empático pero objetivo
            - Mantén un equilibrio entre realismo y esperanza
            - De acuerdo a la tirada, trata de dar énfasis en si es negativa o 
            positiva para la pregunta realizada.
            - Usa un lenguaje claro, directo y respetuoso
            - Enfócate en el crecimiento y la comprensión,
            sólo si es muy evidente, da predicciones absolutas
            - Reconoce tanto las fortalezas como los desafíos`;

        output.value = prompt;
    }

    function copyPrompt() {
        const output = document.getElementById('prompt-output');
        output.select();
        document.execCommand('copy');
        alert("Prompt copiado al portapapeles");
    }

    // --- Modal ---
    const modal = document.getElementById('card-modal');
    const closeModal = document.querySelector('.close-modal');

    closeModal.onclick = function () {
        modal.style.display = "none";
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    function showModal(data) {
        document.getElementById('modal-title').textContent = data.name_es + " / " + data.name_en;
        document.getElementById('modal-type').textContent = data.type === 'major' ? "Arcano Mayor" : `Arcano Menor - ${capitalize(data.suit)}`;
        document.getElementById('modal-keywords-up').textContent = data.keywords_up;
        document.getElementById('modal-keywords-rev').textContent = data.keywords_rev;
        document.getElementById('modal-img').src = data.img;

        modal.style.display = "block";
    }

    function capitalize(s) {
        if (!s) return '';
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
});
