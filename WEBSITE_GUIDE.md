# Guía de Diseño: Página Web de Donaciones Segura en GitHub

Esta guía detalla cómo implementar una sección de donaciones segura, ética y profesional en tu proyecto de GitHub Pages, tal como se solicitó.

## 1. Contexto y Filosofía

-   **Propósito**: Recibir apoyo voluntario sin bloquear contenido ("Pay what you want" o "Buy me a coffee").
-   **Seguridad**: **CERO** exposición de datos bancarios directos.
-   **Hosting**: GitHub Pages (Estático).

## 2. Planificación del Contenido

### Texto y Tono
El mensaje debe ser empático y transparente. Evita pedir dinero por desesperación; enfócate en el valor que aportas.

*Ejemplo de texto:*
> "Desarrollar y mantener este proyecto requiere tiempo y café. Si encuentras valor en estas lecturas de Tarot y deseas apoyar el desarrollo continuo o el mantenimiento del servidor, una donación simbólica es inmensamente agradecida, pero nunca obligatoria."

### Opciones de Donación
Ofrece niveles claros para dar tangibilidad al apoyo:
-   ☕ **Café ($3)**: "Un boost de energía para seguir programando."
-   🍱 **Almuerzo ($10)**: "Ayuda a cubrir una comida mientras trabajo."
-   🔮 **Mecenas ($20+)**: "Apoyo directo para nuevas funcionalidades."

## 3. Desarrollo Técnico (Implementación)

### Estructura (HTML)
No necesitas un backend complejo. Usaremos enlaces directos a las plataformas de pago seguras.

```html
<!-- Sección de Apoyo -->
<section class="support-section">
    <div class="support-content">
        <h2>🔮 Apoya el Proyecto</h2>
        <p>Este tarot interactivo es gratuito y de código abierto. Si te ha sido útil, considera invitarme un café simbólico para mantener la energía fluyendo.</p>
        
        <div class="donation-options">
            <!-- Botón Ko-fi -->
            <a href="https://ko-fi.com/TU_USUARIO" target="_blank" class="btn-donate kofi">
                <img src="https://storage.ko-fi.com/cdn/cup-border.png" alt="Ko-fi icon">
                Invítame un Café
            </a>

            <!-- Botón Buy Me a Coffee -->
            <a href="https://www.buymeacoffee.com/TU_USUARIO" target="_blank" class="btn-donate bmc">
                🍺 Buy Me a Coffee
            </a>
            
             <!-- Botón Stripe (Enlace de pago) -->
            <a href="https://buy.stripe.com/TU_ENLACE_GENERADO" target="_blank" class="btn-donate stripe">
                💳 Donar con Tarjeta
            </a>
        </div>

        <p class="transparency-note">
            <small>Todas las donaciones se gestionan a través de plataformas seguras. No almacenamos tus datos bancarios.</small>
        </p>
    </div>
</section>
```

### Estilos (CSS)
El diseño debe integrarse con tu tema "Premium/Místico".

```css
.support-section {
    background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.8));
    padding: 60px 20px;
    text-align: center;
    border-top: 1px solid var(--glass-border);
    margin-top: 40px;
}

.donation-options {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin: 30px 0;
    flex-wrap: wrap;
}

.btn-donate {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 25px;
    border-radius: 50px;
    text-decoration: none;
    font-weight: bold;
    transition: transform 0.2s, box-shadow 0.2s;
    font-family: var(--font-body);
}

.kofi {
    background-color: #29abe0;
    color: white;
}

.bmc {
    background-color: #FFDD00;
    color: #000000;
}

.stripe {
    background-color: #635bff;
    color: white;
}

.btn-donate:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}
```

## 4. Métodos de Pago y Seguridad

### ❌ Lo que NUNCA debes hacer
-   **Publicar tu CLABE o Número de Cuenta**: Cualquiera puede usar esa info para intentar fraudes o domiciliaciones indebidas.
-   **Publicar tu email de PayPal directamente**: Atrae spam y phishing.
-   **Intentar procesar tarjetas tú mismo**: Requiere certificaciones PCI DSS muy complejas.

### ✅ La Solución: Intermediarios Seguros
Recomiendo usar estos servicios. Ellos manejan la seguridad bancaria; tú solo compartes un enlace público seguro.

1.  **Ko-fi (Recomendado)**
    -   **Ventaja**: 0% comisiones en donaciones directas.
    -   **Pago**: Acepta PayPal y Tarjetas (vía Stripe).
    -   **Privacidad**: Tu email de PayPal se mantiene privado.
    
2.  **Buy Me a Coffee**
    -   **Ventaja**: Muy popular en el mundo dev. Experiencia de usuario muy pulida.
    -   **Costo**: Cobran una pequeña comisión (aprox 5%).

3.  **Stripe Payment Links**
    -   Si quieres algo más "profesional" y directo. Entras a tu dashboard de Stripe -> Payment Links -> Creas un link de precio variable (Donación).
    -   Copias el link `https://buy.stripe.com/...` y lo pones en el botón.
    -   **Seguridad**: Stripe maneja todo. El usuario ve "Donación a [Tu Proyecto]".

## 5. Despliegue y Mantenimiento

1.  **Commit & Push**: Sube los cambios (HTML/CSS) a tu rama `main`.
2.  **GitHub Pages**: Detectará el cambio y actualizará el sitio automáticamente.
3.  **Verificación**: Entra a tu sitio, haz clic en los botones y verifica que lleven a *tue* perfil de pago real (asegúrate de crear las cuentas en Ko-fi/BMC y reemplazar los enlaces de ejemplo).

## Riesgo vs. Beneficio

| Opción | Riesgo | Profesionalismo | Recomendación |
| :--- | :--- | :--- | :--- |
| **Cuenta Bancaria en Texto** | 🔴 Alto (Fraude) | 🔴 Bajo (Parece aficionado) | **NUNCA** |
| **PayPal.Me** | 🟡 Medio (Expone nombre real) | 🟡 Medio | Aceptable |
| **Ko-fi / Plataformas** | 🟢 Bajo (Intermediario) | 🟢 Alto (Branding propio) | **IDEAL** |

---

**Nota Final**: Al usar esta aproximación, proteges tu identidad financiera y la de tus donantes, cumpliendo con el objetivo de una web ética y segura.
