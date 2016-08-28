export interface IEvent<T> {
    on(callback: {(data?: T): void});
    off(callback: {(data?: T): void});
}

export default class Event<T> implements IEvent<T> {
    private _callbacks: {(data?: T): void}[] = [];

    public on(callback: {(data?: T): void}) {
        this._callbacks.push(callback);
    }

    public off(callback: {(data?: T): void}) {
        this._callbacks = this._callbacks.filter(item => (item !== callback));
    }

    public offAll() {
        this._callbacks = [];
    }

    public fire(data?: T) {
        this._callbacks.forEach(callback => callback(data));
    }
}