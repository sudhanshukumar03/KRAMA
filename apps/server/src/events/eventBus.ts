import EventEmitter from 'events';

export type DomainEvent = {
  type: string;
  payload: any;
  timestamp: Date;
};

class EventBus extends EventEmitter {
  emitEvent<T>(type: string, payload: T) {
    const event: DomainEvent = {
      type,
      payload,
      timestamp: new Date(),
    };
    this.emit(type, event);
  }

  onEvent<T>(type: string, handler: (payload: T, event: DomainEvent) => void | Promise<void>) {
    this.on(type, async (event: DomainEvent) => {
      try {
        await handler(event.payload, event);
      } catch (error) {
        console.error(`[EventBus] Error handling event '${type}':`, error, {
          payload: event.payload,
          timestamp: event.timestamp,
        });
      }
    });
  }
}

export const domainEventBus = new EventBus();
