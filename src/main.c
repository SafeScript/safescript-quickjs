/**
 * Example: embedding SafeScript via QuickJS in a C application.
 *
 * Build:
 *   cc -o safescript-embed src/main.c -I/path/to/quickjs -L/path/to/quickjs -lquickjs -lm -ldl -lpthread
 *
 * The program loads the SafeScript bundle into QuickJS, then runs
 * user-provided .safe code through it.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "quickjs.h"

/* Read an entire file into a malloc'd buffer. Caller frees. */
static char *read_file(const char *path, size_t *out_len) {
    FILE *f = fopen(path, "rb");
    if (!f) return NULL;
    fseek(f, 0, SEEK_END);
    size_t len = ftell(f);
    fseek(f, 0, SEEK_SET);
    char *buf = malloc(len + 1);
    if (!buf) { fclose(f); return NULL; }
    fread(buf, 1, len, f);
    buf[len] = '\0';
    fclose(f);
    if (out_len) *out_len = len;
    return buf;
}

/**
 * Run a SafeScript source string through the embedded engine.
 * Returns a JSON string (caller must JS_FreeValue).
 */
static JSValue safescript_run(JSContext *ctx, const char *source, const char *scope_json) {
    /* Build the JS call: __safescript.run(source, scopeJSON) */
    char *escaped_source = NULL;
    char *call = NULL;

    /* Simple JSON-string escape for the source */
    size_t slen = strlen(source);
    size_t elen = 0;
    escaped_source = malloc(slen * 2 + 1);
    for (size_t i = 0; i < slen; i++) {
        char c = source[i];
        if (c == '"' || c == '\\') { escaped_source[elen++] = '\\'; }
        else if (c == '\n') { escaped_source[elen++] = '\\'; c = 'n'; }
        else if (c == '\r') { escaped_source[elen++] = '\\'; c = 'r'; }
        else if (c == '\t') { escaped_source[elen++] = '\\'; c = 't'; }
        escaped_source[elen++] = c;
    }
    escaped_source[elen] = '\0';

    /* Build the call string */
    const char *sj = scope_json ? scope_json : "{}";
    size_t call_len = elen + strlen(sj) + 64;
    call = malloc(call_len);
    snprintf(call, call_len, "__safescript.run(\"%s\", '%s')", escaped_source, sj);

    JSValue result = JS_Eval(ctx, call, strlen(call), "<safescript>", JS_EVAL_TYPE_GLOBAL);

    free(escaped_source);
    free(call);
    return result;
}

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <file.safe> [scope.json]\n", argv[0]);
        fprintf(stderr, "\nEmbeds SafeScript in QuickJS and runs the given .safe file.\n");
        fprintf(stderr, "Requires dist/safescript-quickjs.js (run: node bundle.js)\n");
        return 1;
    }

    /* Read the .safe file */
    size_t safe_len;
    char *safe_source = read_file(argv[1], &safe_len);
    if (!safe_source) {
        fprintf(stderr, "Error: cannot read %s\n", argv[1]);
        return 1;
    }

    /* Read optional scope JSON */
    char *scope_json = NULL;
    if (argc >= 3) {
        scope_json = read_file(argv[2], NULL);
    }

    /* Initialize QuickJS */
    JSRuntime *rt = JS_NewRuntime();
    JSContext *ctx = JS_NewContext(rt);

    /* Load the SafeScript bundle */
    size_t bundle_len;
    char *bundle = read_file("dist/safescript-quickjs.js", &bundle_len);
    if (!bundle) {
        fprintf(stderr, "Error: cannot read dist/safescript-quickjs.js\n");
        fprintf(stderr, "Run: node bundle.js\n");
        free(safe_source);
        JS_FreeContext(ctx);
        JS_FreeRuntime(rt);
        return 1;
    }

    JSValue init = JS_Eval(ctx, bundle, bundle_len, "safescript-quickjs.js", JS_EVAL_TYPE_GLOBAL);
    if (JS_IsException(init)) {
        JSValue exc = JS_GetException(ctx);
        const char *msg = JS_ToCString(ctx, exc);
        fprintf(stderr, "Bundle load error: %s\n", msg);
        JS_FreeCString(ctx, msg);
        JS_FreeValue(ctx, exc);
        free(bundle);
        free(safe_source);
        JS_FreeContext(ctx);
        JS_FreeRuntime(rt);
        return 1;
    }
    JS_FreeValue(ctx, init);
    free(bundle);

    /* Run the SafeScript code */
    JSValue result = safescript_run(ctx, safe_source, scope_json);

    if (JS_IsException(result)) {
        JSValue exc = JS_GetException(ctx);
        const char *msg = JS_ToCString(ctx, exc);
        fprintf(stderr, "Error: %s\n", msg);
        JS_FreeCString(ctx, msg);
        JS_FreeValue(ctx, exc);
    } else {
        const char *str = JS_ToCString(ctx, result);
        if (str) {
            printf("%s\n", str);
            JS_FreeCString(ctx, str);
        }
    }

    JS_FreeValue(ctx, result);
    free(safe_source);
    free(scope_json);
    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
    return 0;
}
