# safescript-quickjs

Embed [SafeScript](https://github.com/SafeScript/safescript) in C, C++, and Rust applications via [QuickJS](https://bellard.org/quickjs/). The Lua-replacement story: a safe, sandboxed scripting language your users can write, with zero risk of breakout.

## Why

Lua is the standard for embedded scripting, but it's a whole separate language your users have to learn. SafeScript is JavaScript — the language everyone already knows — stripped to a safe computational subset. No `eval`, no `Function`, no prototype pollution, no global access. Your users write familiar code; your application stays safe.

This package generates a single JavaScript file you load into QuickJS. The file contains the full SafeScript compiler and runtime, plus a JSON-based bridge API your C code calls through `JS_Eval`.

## Quick start

```bash
npm install safescript-quickjs
node node_modules/safescript-quickjs/bundle.js
# → dist/safescript-quickjs.js
```

Or programmatically:

```javascript
var generator = require('safescript-quickjs');
var bundle = generator.generateBundle();
require('fs').writeFileSync('safescript-quickjs.js', bundle);
```

## C integration

```c
#include "quickjs.h"

int main() {
    JSRuntime *rt = JS_NewRuntime();
    JSContext *ctx = JS_NewContext(rt);

    // Load the SafeScript bundle
    char *bundle = read_file("dist/safescript-quickjs.js");
    JS_Eval(ctx, bundle, strlen(bundle), "safescript.js", JS_EVAL_TYPE_GLOBAL);

    // Compile SafeScript code (run() is unavailable — auto-async needs Promises)
    const char *js =
        "__safescript.compile("
        "  'var x = 2 + 2; return x;'"
        ")";
    JSValue result = JS_Eval(ctx, js, strlen(js), "<ss>", JS_EVAL_TYPE_GLOBAL);

    // result is '{"ok":true,"code":"...","hash":"..."}'
    const char *str = JS_ToCString(ctx, result);
    printf("%s\n", str);

    JS_FreeCString(ctx, str);
    JS_FreeValue(ctx, result);
    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
}
```

## Bridge API

The bundle defines `globalThis.__safescript` with methods for static analysis and compilation. All take and return JSON strings for easy C interop.

> **Note:** SafeScript v0.3 uses an auto-async execution model where `run()` always returns a Promise. Since QuickJS does not support Promises or async/await, `__safescript.run()` is **unavailable** in this bundle. Use `compile()` to get the emitted JavaScript and execute it in an async-capable runtime (Node.js, Deno, browser).

**`__safescript.compile(source)`** → `'{"ok":true,"code":"...","hash":"..."}'` or `'{"ok":false,"error":"..."}'`

Compile SafeScript to JavaScript and return the compiled code. This is the primary method — the C host compiles SafeScript here, then passes the emitted code to an async-capable runtime for execution.

**`__safescript.validate(source)`** → `'{"ok":true}'` or `'{"ok":false,"errors":[...]}'`

Check whether source is valid SafeScript without compiling it.

**`__safescript.capabilities(source)`** → JSON header

Parse the `@safescript` header and return declared capabilities (`@needs`, `@uses`, `@env`).

**`__safescript.run(source, scopeJSON)`** → always returns `'{"ok":false,"error":"..."}'`

Disabled in QuickJS. Returns an error explaining that the auto-async model requires Promise support. Use `compile()` instead.

## Passing capabilities

SafeScript files declare what they need via `@needs` headers. Your host application reads those declarations, compiles the source, and passes the compiled code to an async-capable runtime:

```c
// 1. Parse capabilities
const char *js1 = "__safescript.capabilities(source)";
// → '{"version":"0.3","needs":[{"name":"config","type":"Object"}]}'

// 2. Compile SafeScript → JavaScript
const char *js2 = "__safescript.compile(source)";
// → '{"ok":true,"code":"async function ...","hash":"abc123"}'

// 3. Execute the compiled code in an async-capable runtime
//    (Node.js, Deno, or browser — not QuickJS)
```

## Building the C example

A full C example is in `src/main.c`. To build it:

```bash
make bundle    # generate the JS bundle
make example   # compile the C example (requires QuickJS headers)
make run       # run examples/hello.safe
```

Set `QUICKJS_DIR` and `QUICKJS_LIB` if QuickJS isn't in `/usr/local`:

```bash
make example QUICKJS_DIR=/path/to/quickjs QUICKJS_LIB=/path/to/quickjs
```

## Examples

See `examples/` for `.safe` files demonstrating embedded use cases:

- `hello.safe` — minimal example
- `config-validator.safe` — validate a config object from the host
- `transform.safe` — transform data records (the classic Lua use case)

## Rust / C++ / other

Any language with QuickJS bindings works the same way. Load the bundle, call `__safescript.compile()` through the JS eval interface, parse the JSON result. Execute the compiled code in an async-capable runtime.

For Rust, [rquickjs](https://github.com/DelSkaorth/rquickjs) and [quickjs-rs](https://github.com/nicoster/quickjs-rs) both support `JS_Eval` and string interop.

## License

MIT — Gregory Magarshak
