import EventEmitter from 'events';
export type DomainEvent = {
    type: string;
    payload: any;
    timestamp: Date;
};
declare class EventBus extends EventEmitter {
    emitEvent<T>(type: string, payload: T): void;
    onEvent<T>(type: string, handler: (payload: T, event: DomainEvent) => void): void;
}
export declare const domainEventBus: EventBus;
export {};
//# sourceMappingURL=eventBus.d.ts.map