/**
 * Lightweight, zero-dependency mock DOM implementation for unit testing
 * the datepicker UI shell in Node.js environments without jsdom/happy-dom.
 */

export class MockStyle {
  private readonly properties = new Map<string, string>();

  public setProperty(name: string, value: string): void {
    this.properties.set(name, value);
  }

  public getPropertyValue(name: string): string {
    return this.properties.get(name) ?? "";
  }

  public removeProperty(name: string): string {
    const val = this.properties.get(name) ?? "";
    this.properties.delete(name);
    return val;
  }
}

export class MockMouseEvent extends Event {
  public clientX: number;
  public clientY: number;

  public constructor(type: string, init?: EventInit & { clientX?: number; clientY?: number }) {
    super(type, init);
    this.clientX = init?.clientX ?? 0;
    this.clientY = init?.clientY ?? 0;
  }
}

type EventListenerEntry = {
  listener: EventListenerOrEventListenerObject;
  signal?: AbortSignal;
};

export class MockElement {
  public readonly nodeType: number = 1;
  public tagName: string;
  public id: string = "";
  public className: string = "";
  public title: string = "";
  public textContent: string = "";
  public innerHTML: string = "";
  public value: string = "";
  public type: string = "";
  public disabled: boolean = false;
  public open: boolean = false;
  public parentNode: MockElement | null = null;
  public readonly children: MockElement[] = [];
  public readonly style: MockStyle = new MockStyle();
  private readonly attributes = new Map<string, string>();
  private readonly listeners = new Map<string, EventListenerEntry[]>();

  public constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value));
    if (name === "id") {
      this.id = String(value);
    }
    if (name === "class") {
      this.className = String(value);
    }
  }

  public getAttribute(name: string): string | null {
    if (name === "id") return this.id || null;
    if (name === "class") return this.className || null;
    return this.attributes.get(name) ?? null;
  }

  public hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  public removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  public appendChild<T extends MockElement>(child: T): T {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  public remove(): void {
    if (this.parentNode) {
      const idx = this.parentNode.children.indexOf(this);
      if (idx !== -1) {
        this.parentNode.children.splice(idx, 1);
      }
      this.parentNode = null;
    }
  }

  public after(...nodes: (MockElement | string)[]): void {
    if (!this.parentNode) {
      return;
    }
    const parent = this.parentNode;
    const currentIndex = parent.children.indexOf(this);
    if (currentIndex === -1) {
      return;
    }
    let insertAt = currentIndex + 1;
    for (const node of nodes) {
      if (node instanceof MockElement) {
        node.parentNode = parent;
        parent.children.splice(insertAt, 0, node);
        insertAt += 1;
      }
    }
  }

  public addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void {
    const signal = typeof options === "object" ? options.signal : undefined;
    if (signal?.aborted) {
      return;
    }
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    const entries = this.listeners.get(type)!;
    const entry: EventListenerEntry = { listener, signal };
    entries.push(entry);

    if (signal) {
      signal.addEventListener("abort", () => {
        this.removeEventListener(type, listener);
      });
    }
  }

  public removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const entries = this.listeners.get(type);
    if (!entries) return;
    const idx = entries.findIndex((e) => e.listener === listener);
    if (idx !== -1) {
      entries.splice(idx, 1);
    }
  }

  public dispatchEvent(event: Event): boolean {
    const entries = this.listeners.get(event.type);
    if (!entries) return true;
    for (const entry of entries) {
      if (entry.signal?.aborted) continue;
      if (typeof entry.listener === "function") {
        entry.listener.call(this, event);
      } else if (typeof entry.listener === "object" && "handleEvent" in entry.listener) {
        entry.listener.handleEvent(event);
      }
    }
    return true;
  }

  public focus(): void {
    if (mockDocument) {
      mockDocument.activeElement = this;
    }
  }

  public blur(): void {
    if (mockDocument && mockDocument.activeElement === this) {
      mockDocument.activeElement = null;
    }
  }

  public getBoundingClientRect(): DOMRect {
    return {
      x: 100,
      y: 100,
      width: 300,
      height: 250,
      top: 100,
      right: 400,
      bottom: 350,
      left: 100,
      toJSON(): Record<string, number> {
        return {
          x: 100,
          y: 100,
          width: 300,
          height: 250,
          top: 100,
          right: 400,
          bottom: 350,
          left: 100,
        };
      },
    };
  }

  // Dialog specific
  public showModal(): void {
    this.open = true;
    this.setAttribute("open", "");
    this.focus();
  }

  public close(): void {
    if (!this.open && !this.hasAttribute("open")) {
      return;
    }
    this.open = false;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  }
}

export class MockDocument {
  public body: MockElement = new MockElement("body");
  public activeElement: MockElement | null = null;

  public createElement(tagName: string): MockElement {
    const el = new MockElement(tagName);
    if (tagName.toLowerCase() === "dialog") {
      el.open = false;
    }
    return el;
  }
}

let mockDocument: MockDocument | null = null;

export function setupMockDom(): { document: MockDocument } {
  mockDocument = new MockDocument();
  (globalThis as unknown as { document: MockDocument }).document = mockDocument;
  (globalThis as unknown as { HTMLElement: typeof MockElement }).HTMLElement = MockElement;
  (globalThis as unknown as { HTMLInputElement: typeof MockElement }).HTMLInputElement =
    MockElement;
  (globalThis as unknown as { HTMLButtonElement: typeof MockElement }).HTMLButtonElement =
    MockElement;
  (globalThis as unknown as { HTMLDialogElement: typeof MockElement }).HTMLDialogElement =
    MockElement;
  (globalThis as unknown as { HTMLSelectElement: typeof MockElement }).HTMLSelectElement =
    MockElement;
  (globalThis as unknown as { HTMLOptionElement: typeof MockElement }).HTMLOptionElement =
    MockElement;
  (globalThis as unknown as { HTMLDivElement: typeof MockElement }).HTMLDivElement = MockElement;
  (globalThis as unknown as { MouseEvent: typeof MockMouseEvent }).MouseEvent = MockMouseEvent;

  return { document: mockDocument };
}

export function teardownMockDom(): void {
  mockDocument = null;
  delete (globalThis as unknown as { document?: unknown }).document;
  delete (globalThis as unknown as { HTMLElement?: unknown }).HTMLElement;
  delete (globalThis as unknown as { HTMLInputElement?: unknown }).HTMLInputElement;
  delete (globalThis as unknown as { HTMLButtonElement?: unknown }).HTMLButtonElement;
  delete (globalThis as unknown as { HTMLDialogElement?: unknown }).HTMLDialogElement;
  delete (globalThis as unknown as { HTMLSelectElement?: unknown }).HTMLSelectElement;
  delete (globalThis as unknown as { HTMLOptionElement?: unknown }).HTMLOptionElement;
  delete (globalThis as unknown as { HTMLDivElement?: unknown }).HTMLDivElement;
  delete (globalThis as unknown as { MouseEvent?: unknown }).MouseEvent;
}
