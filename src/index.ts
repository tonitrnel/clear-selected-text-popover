// ==UserScript==
// @name        清除选中文本弹出气泡 - geekbang.org
// @namespace   Violentmonkey Scripts
// @homepage    https://github.com/tonitrnel/events-remove-script.git
// @match       https://time.geekbang.org/column/article/*
// @grant       none
// @version     1.1
// @author      Tonitrnel
// @description 2022/1/13 下午11:05:40
// ==/UserScript==

interface EventObject {
  type: string;
  listener: (event: Event) => void;
  once: boolean;
  passive: boolean;
  capture: boolean;
  signal: AbortSignal | undefined;
  useCapture: boolean;
}
type EventType = string;

const eventsMap = new WeakMap<EventTarget, Record<EventType, EventObject[]>>();
const originalEventManager = {
  addEventListener: EventTarget.prototype.addEventListener,
  removeEventListener: EventTarget.prototype.removeEventListener,
};
EventTarget.prototype.addEventListener = function addEventListener(
  type,
  listener,
  options
): void {
  if (!listener) return void 0;
  if (typeof listener === 'object')
    return originalEventManager.addEventListener.call(
      this,
      type,
      listener,
      options
    );
  const { once, passive, capture, signal, useCapture } =
    typeof options === 'boolean'
      ? {
          capture: false,
          once: false,
          passive: false,
          signal: void 0,
          useCapture: options,
        }
      : {
          once: options?.once ?? false,
          passive: options?.passive ?? false,
          capture: options?.capture ?? false,
          signal: options?.signal,
          useCapture: false,
        };
  originalEventManager.addEventListener.call(this, type, listener, options);
  if (!eventsMap.has(this)) eventsMap.set(this, {});
  const events = eventsMap.get(this)!;
  const eventObject: EventObject = {
    type,
    listener,
    once,
    passive,
    capture,
    signal,
    useCapture,
  };
  if (Array.isArray(events[type])) {
    events[type].push(eventObject);
  } else {
    events[type] = [eventObject];
  }
};
EventTarget.prototype.removeEventListener = function removeEventListener(
  type,
  listener,
  options
): void {
  if (!listener) return void 0;
  originalEventManager.removeEventListener.call(this, type, listener, options);
  if (!eventsMap.has(this)) return void 0;
  const events = eventsMap.get(this)!;
  if (!events[type] || events[type].length === 0) return void 0;
  events[type].splice(
    events[type].findIndex((it) => it.listener === listener),
    1
  );
  if (events[type].length === 0) delete events[type];
  if (Object.keys(events).length === 0) eventsMap.delete(this);
};

window.getEventListeners = (element) => {
  return Object.entries(eventsMap.get(element) ?? {}).reduce(
    (obj, [type, events]) => {
      obj[type] = events;
      return obj;
    },
    {} as Record<EventType, EventObject[]>
  );
};

(() => {
  function removePopoverBoundEvents(): void {
    Object.entries(window.getEventListeners(document))
      .filter(([k]) => k.startsWith('mouse'))
      .flatMap(([, events]) => events)
      .filter((it) => it.listener.name.startsWith('bound'))
      .forEach((event) =>
        document.removeEventListener(event.type, event.listener)
      );
  }
  function bindTurningPageEvents() {
    const handler = async (): Promise<void> => {
      await waitContentReady();
      removePopoverBoundEvents();
    };
    document
      .querySelector('div[class^=Index_leftSideScrollArea]')
      ?.addEventListener('click', (e) => {
        const target = e.target as HTMLDivElement;
        if (!target.className.includes('ArticleItem')) return void 0;
        return handler()
      });
    document
      .querySelector('div[class^=Index_prevBtn]')
      ?.addEventListener('click', handler);
    document
      .querySelector('div[class^=Index_nextBtn]')
      ?.addEventListener('click', handler);
  }
  function waitContentReady(): Promise<void> {
    return new Promise((resolve) => {
      const handler = async (): Promise<void> => {
        if (document.querySelector('div[class^=RichContentPC_wrap]') === null) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          window.requestIdleCallback(handler);
          return void 0;
        }
        resolve();
      };
      window.requestIdleCallback(handler);
    });
  }
  async function main() {
    await waitContentReady();
    removePopoverBoundEvents();
    bindTurningPageEvents();
  }

  document.addEventListener('DOMContentLoaded', main);
})()
