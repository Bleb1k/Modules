import { compose, compose_counter } from "./compose_combos.js";

class Stream {
  data = []
  readable = false
  writable = false

  #notification = () => { }
  #updateOutput = () => { }
  constructor(buffer = [], rwx = "", updates = {}) {
    this.data = buffer
    if (rwx.includes("r"))
      this.readable = true
    if (rwx.includes("w"))
      this.writable = true

    if (updates.update_output) this.#updateOutput = updates.update_output
  }
  push(...bytes) {
    if (!this.writable) throw new Error("Stream is not writable");
    const len = this.data.push(...bytes);
    this.#updateOutput()
    this.#notification();
    return len;
  }
  async read() {
    if (!this.readable) throw new Error("Stream is not readable")
    if (!this.data.length)
      await new Promise((res) => {
        this.#notification = () =>
          void (res(), this.#notification = () => { })
      })
    console.log(this.data.slice(0, this.data.length).join(""))
    return this.data.splice(0, this.data.length).join("")
  }
  notify() {
    this.#notification()
  }
}

class Terminal {
  // ----- Terminal data -----
  raw_mode = true;
  #composing = false;
  #stdin_buf = [];
  #stdout_buf = [];
  /** @type {Stream} */
  stdin
  /** @type {Stream} */
  stdout

  // ----- HTML data -----
  /** @type {?HTMLElement} */
  parent_element;
  /** @type {?HTMLElement} */
  terminal_element;
  /** @type {?HTMLElement} */
  content_element;
  /** @type {?HTMLElement} */
  cursor_element;

  style_class = "terminal_" +
    Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

  // ----- Functions -----
  /** @param {{
      parent_element?: HTMLElement,
      shell?: (term: Terminal) => Promise<void>,
  }} options */
  constructor(options = {}) {
    if (options.parent_element) {
      this.parent_element = options.parent_element;
    }
    this.stdin = new Stream(this.#stdin_buf, "r")
    this.stdout = new Stream(this.#stdout_buf, "w", {
      update_output: () => {
        console.log(this.content_element, this.#stdout_buf)
        this.content_element.innerHTML += this.#stdout_buf.splice(0, this.#stdout_buf.length).join("")
      }
    })

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
      this.cursor_element = this.parent_element.querySelector(
        "." + this.style_class + "_cursor",
      );
      if (!this.cursor_element) {
        throw new Error("Can't get generated terminal dom element.");
      }
      console.log(this);
      this.initEvents();
    }

    options.shell?.(this)
  }

  initEvents() {
    let compose_buf = ""
    this.content_element.addEventListener(
      // keydown can detect "Compose" and also know that it's "CapsLock"
      // by :key and :code respectively
      "keydown",
      (evt) => {
        const update_cursor = () => {
          const m = /\n?([^\n]*?)$/s.exec(this.content_element.innerText)[1].length + 1
          this.cursor_element.textContent = evt.key === "Enter" ? "_" : "_".trimStart().padStart(m, " ")
        }
        // possible object for events etc...
        // console.log("KeyDown content:", {
        //   key: evt.code,
        //   char: evt.key,
        //   composing: evt.isComposing,
        // }, evt);
        if (this.#composing) {
          const key = evt.key === "Enter" ? '\n' : evt.key;
          if (
            evt.key.length === 1 &&
            compose_counter[compose_buf += evt.key]
          ) return
          this.#composing = false;
          if (compose_buf = compose[compose_buf]) {
            this.#stdin_buf.push(...compose_buf)
            if (!this.raw_mode) this.stdin.notify()
            update_cursor();
          }
          compose_buf = "";
        } else
          switch (true) {
            case evt.key === "Compose":
              this.#composing = true;
              return;
            case evt.key === "Enter":
              this.#stdin_buf.push("\n")
              break
            case evt.key.length === 1:
              this.#stdin_buf.push(evt.key);
              break;
            default:
              console.log("Unknown key:", {
                key: evt.code,
                char: evt.key,
                composing: evt.isComposing,
              })
              return
          }
        if (!this.raw_mode) {
          if (this.#stdin_buf.at(-1) !== "\n") {
            this.content_element.innerText += this.#stdin_buf.at(-1)
            update_cursor()
            return;
          }
          this.content_element.innerText =
            this.content_element.innerText.slice(0, this.content_element.innerText.length - this.#stdin_buf.length + 1) // count the \n
            update_cursor()
        }
        this.stdin.notify()
        update_cursor()
      },
    );
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
                position: relative;
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
                font-family: monospace;
                white-space: pre;
                position: absolute;
                width: 100%;
                height: 100%;
            }
            .${this.style_class}_content:focus {
                outline: none;
                border: none;
                box-shadow: none;
            }

            @keyframes blink {
              0% {
                opacity: 1;
              }
              50% {
                opacity: 0;
              }
            }
            .${this.style_class}_cursor {
              height: 100%;
              align-content: end;
              font-family: monospace;
              animation: blink 0.5s infinite;
              position: absolute;
            }
        </style>`;
    return `${style}
        <div class="${this.style_class}">
            <div class="${this.style_class}_cursor">_</div>
            <div type="none" class="${this.style_class}_content" tabindex="0"></div>
        </div>`;
  }
}
new Terminal({
  parent_element: document.body,
  shell: async (term) => {
    term.raw_mode = false
    for (; ;) {
      const bytes = await term.stdin.read()
      console.log(bytes)
      term.stdout.push(...bytes)
    }
  }
})
