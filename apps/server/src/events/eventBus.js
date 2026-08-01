import EventEmitter from 'events';
class EventBus extends EventEmitter {
    emitEvent(type, payload) {
        const event = {
            type,
            payload,
            timestamp: new Date(),
        };
        this.emit(type, event);
    }
    onEvent(type, handler) {
        this.on(type, (event) => {
            try {
                handler(event.payload, event);
            }
            catch (error) {
                console.error(`Error handling event ${type}:`, error);
            }
        });
    }
}
export const domainEventBus = new EventBus();
//# sourceMappingURL=eventBus.js.map