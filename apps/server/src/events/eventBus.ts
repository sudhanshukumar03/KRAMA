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

  onEvent<T>(type: string, handler: (payload: T, event: DomainEvent) => void) {
    this.on(type, (event: DomainEvent) => {
      try {
        handler(event.payload, event);
      } catch (error) {
        console.error(`Error handling event ${type}:`, error);
      }
    });
  }
}

export const domainEventBus = new EventBus();
