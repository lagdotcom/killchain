export default class MinHeap<T extends { cost: number }> {
  private heap: T[] = [];

  get length() {
    return this.heap.length;
  }

  push(node: T) {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    const first = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0 && last) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return first;
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[i]!.cost >= this.heap[parent]!.cost) break;
      [this.heap[i], this.heap[parent]] = [this.heap[parent]!, this.heap[i]!];
      i = parent;
    }
  }

  private sinkDown(i: number) {
    const n = this.heap.length;
    let smallest = i;
    for (;;) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.heap[left]!.cost < this.heap[smallest]!.cost)
        smallest = left;
      if (right < n && this.heap[right]!.cost < this.heap[smallest]!.cost)
        smallest = right;
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [
        this.heap[smallest]!,
        this.heap[i]!,
      ];
      i = smallest;
    }
  }
}
