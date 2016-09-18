import 'reflect-metadata';

//Event class
const stickyEvents = new Set<Function>()
//Subscriber class -> (Event class -> Handler methods)
const subscriptions = new Map<Function, Map<Function, Function>>()

function forEachSubscription(subscriber: Object, callback: (subscription: Map<Function, Function>) => void) {
    for(let type = subscriber.constructor; type; type = type.prototype) {
        let subscription = subscriptions.get(type)
        if(subscription) callback(subscription);
    }    
}

export function sticky(constructor: Function) {
    stickyEvents.add(constructor)
}

export function subscribe(target: any, name: string, descriptor: TypedPropertyDescriptor<Function>) {
    if(descriptor.value!.length !== 1) throw new Error(`Function ${name} must have a single argument`);
    const eventType = Reflect.getMetadata("design:paramtypes", target, name)[0];
    let subscription = subscriptions.get(target);
    if(!subscription) {
        subscription = new Map<Function, Function>();
        subscriptions.set(target, subscription);
    }
    subscription.set(eventType, descriptor.value);
}

export class EventBus {
    //Event class -> [Subscriber instance]
    private readonly subscribers = new Map<Function, Set<Object>>()
    //Event instance -> [Subscriber instance]
    private readonly eventHistory: Object[] = []

    private call(subscriber: Object, event: Object, eventType: Function = event.constructor): void {
        forEachSubscription(subscriber, subscription => {
            let handler = subscription.get(eventType);
            if(handler) handler.call(subscriber, event);
        });
    }

    private registerForEventType(subscriber: Object, eventType: Function, handler?: Function): void {
        let subscribers = this.subscribers.get(eventType);
        if(!subscribers) {
            subscribers = new Set<Object>();
            this.subscribers.set(eventType, subscribers);
        }
        subscribers.add(subscriber);        
        if(!stickyEvents.has(eventType)) return;
        this.eventHistory.filter(e => e instanceof eventType).forEach(
            e => handler ? handler.call(subscriber, e) : this.call(subscriber, e)
        );
    }

    register(subscriber: Object, eventType?: Function): void {
        if(eventType) {
            this.registerForEventType(subscriber, eventType);
            return;
        }
        forEachSubscription(subscriber, subscription => {
            for(let [eventType, handler] of subscription.entries()) {
                this.registerForEventType(subscriber, eventType, handler);
            }
        })
    }

    unregister(subscriber: any, eventType?: Function): void {
        if(!eventType) {
            this.subscribers.forEach(s => s.delete(subscriber));            
        } else {
            const subscribers = this.subscribers.get(eventType);
            if(subscribers) subscribers.delete(subscriber);
        }
    }

    unregisterAll(eventType: Function): void {
        this.subscribers.delete(eventType);
    }

    publish(event: Object) {
        if(stickyEvents.has(event.constructor)) {
            this.eventHistory.push(event);
        }
        for(let type = event.constructor; type; type = type.prototype) {
            const subscribers = this.subscribers.get(type);
            if(!subscribers) continue;
            for (let subscriber of subscribers) {
                this.call(subscriber, event, type);
            }
        }
    }
} 

