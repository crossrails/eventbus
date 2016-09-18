import {sticky, subscribe, EventBus} from './eventbus'

@sticky
class TestEvent {
    constructor(public readonly message: string) {}
}

class TestSubscriber {
    handled: boolean;

    constructor(eventBus: EventBus) {
        eventBus.register(this);
    }

    @subscribe
    handleEvent(event: TestEvent): void {
        this.handled = true;
        console.log(event.message)
    }
}

describe("EventBus", () => {
    
    it("calls a handler method when its subscribed event is published", () => {
        const eventBus = new EventBus();
        const subscriber = new TestSubscriber(eventBus);
        eventBus.publish(new TestEvent("Hello"));
        expect(subscriber.handled).toBe(true);
    })
})