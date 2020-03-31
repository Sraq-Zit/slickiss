class MessageManager{
    static callbacks = {};
    static i = 0;
    static attachListener(callback){
        window.addEventListener('message', callback)
        this.callbacks[++this.i] = callback;
        return this.i;
    }

    static removeListener(id){
        if(typeof id != 'number') throw 'Listeners are indexed by numbered identifiers';
        if(typeof this.callbacks[id] != 'function') console.warn(`Listener with id ${id} was already removed`);
        window.removeEventListener('message', this.callbacks[id]);
        this.callbacks[id] = null;
    }
}