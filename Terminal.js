class Terminal {
    // ----- Terminal data -----
    raw_mode = true;
    stdin = [];
    stdout = [];

    // ----- HTML data -----
    /** @type {?HTMLElement} */
    parent_element;
    /** @type {?HTMLElement} */
    terminal_element;
    /** @type {?HTMLElement} */
    content_element;

    /** @type {?HTMLElement} */
    style_class = "terminal_" +
        Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

    // ----- Functions -----
    /** @param {{
        parent_element?: HTMLElement,
    }} options */
    constructor(options = {}) {
        if (options.parent_element) {
            this.parent_element = options.parent_element;
        }

        if (this.parent_element) {
            this.parent_element.innerHTML = this.generateHTML();
            this.terminal_element = this.parent_element.querySelector(
                "." + this.style_class,
            );
            if (!this.terminal_element) {
                throw new Error("Can't get generated terminal dom element.");
            }
            this.content_element = this.parent_element.querySelector(
                "." + this.style_class + "_content",
            );
            if (!this.content_element) {
                throw new Error("Can't get generated terminal dom element.");
            }
            console.log(this);
            this.content_element.addEventListener(
                // keydown can detect "Compose" and also know that it's "CapsLock"
                // by :key and :code respectively
                "keydown",
                (evt) => {
                    if (evt.key === "Compose") {
                        const input = this.content_element.firstElementChild;
                        input?.focus();
                    }
                    console.log("KeyDown conent:", {
                        key: evt.code,
                        char: evt.key,
                        composing: evt.isComposing,
                    }, evt);
                },
            );
            this.content_element.firstChild.addEventListener(
                "compositionstart",
                (evt) => {
                    console.log(evt);
                },
            );
            this.content_element.firstChild.addEventListener(
                "compositionend",
                (evt) => {
                    console.log(evt);
                },
            );
        }
    }

    generateHTML() {
        const style = `<style>
            .${this.style_class} {
                width: 100%;
                height: 100%;
                outline: none;
                border: none;
                box-shadow: none;
                padding: 0;
                margin: 0;
                color: #000;
                background: #fff;
                justify-content: end;
                overflow-y: hidden;
                cursor: text;
            }
            @media (prefers-color-scheme: dark) {
                .${this.style_class} {
                    color: #e0e0e0;
                    background: #1e1e1e;
                }
            }
            .${this.style_class}_content {
                min-height: 100%;
                align-content: end;
            }
            .${this.style_class}_content:focus {
                outline: none;
                border: none;
                box-shadow: none;
            }
        </style>`;
        return `${style}
        <div class="${this.style_class}">
            <div type="none" class="${this.style_class}_content" tabindex="0">
                <input style="display:hidden;">
            </div>
        </div>`;
    }
}
