// Implement Queue to reduce the time Complexity from O(n) -> O(1) for dequeue operation (removing element from start of queue).
// This is done by using a LinkedList to store the elements.

class Node {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
};

class GameQueue {
    constructor() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }
    enqueue(value) {
        const newNode = new Node(value);

        if (this.isEmpty()) {
            this.head = newNode;
            this.tail = newNode;
        } else {
            this.tail.next = newNode;
            this.tail = newNode;
        }
        this.size++;
    }

    isEmpty() {
        return this.size === 0;
    }

    dequeue() {
        if (this.isEmpty()) {
            return null;
        }
        const removedValue = this.head.value;
        this.head = this.head.next;
        this.size--;
        return removedValue;
    }

    peek() {
        if (this.isEmpty()) {
            return null;
        }
        return this.head.value;
    }

    printQueue() {
        let current = this.head;
        while (current) {
            console.log(current.value);
            current = current.next;
        }
    }

    queueToArray() {
        const arr = [];
        let current = this.head;
        while (current) {
            arr.push(current.value);
            current = current.next;
        }
        return arr;
    }

    toArray() {
        return this.queueToArray();
    }

    size() {
        return this.size;
    }
};

export default GameQueue;