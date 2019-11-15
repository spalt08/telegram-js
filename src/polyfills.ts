if (!('isConnected' in Node.prototype)) {
  Object.defineProperty(Node.prototype, 'isConnected', {
    get() {
      return document.documentElement.contains(this);
    },
  });
}

if (!Object.values) {
  Object.values = <T>(object: Record<keyof any, T>): T[] => Object.keys(object).map((key) => object[key]);
}
