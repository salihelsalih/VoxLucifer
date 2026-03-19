window.alert = () => true;
window.confirm = () => true;
window.prompt = () => null;
Object.defineProperty(document, 'oncopy', { value: () => true, writable: true });
Object.defineProperty(document, 'onpaste', { value: () => true, writable: true });
