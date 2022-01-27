declare interface Window{
  getEventListeners: (
    element: Element | Document | Window | DocumentFragment
  ) => Record<EventType, EventObject[]>;
}