// Polyfill WeakRef for Hermes on old architecture (newArchEnabled: false).
// react-native-reanimated's worklet runtime probes for WeakRef at initialisation;
// without this, Hermes throws "Property 'WeakRef' doesn't exist" on startup.
if (typeof (global as any).WeakRef === "undefined") {
  (global as any).WeakRef = class WeakRef {
    private _target: unknown;
    constructor(target: unknown) {
      this._target = target;
    }
    deref(): unknown {
      return this._target;
    }
  };
}

// Must use require() — not import — so Metro executes this AFTER the polyfill above.
// ES module imports are hoisted and would run before any code in this file.
require("expo-router/entry");
