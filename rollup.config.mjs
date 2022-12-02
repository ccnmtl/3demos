/* eslint-env node */

import svelte from "rollup-plugin-svelte";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import livereload from "rollup-plugin-livereload";
import css from "rollup-plugin-css-only";
import terser from "@rollup/plugin-terser";
import * as child_process from "child_process";

import pkg from "svelte-preprocess";
const { replace } = pkg;

const production = !process.env.ROLLUP_WATCH;

function serve() {
  let server;

  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = child_process.spawn("npm", ["run", "start", "--", "--dev"], {
        stdio: ["ignore", "inherit", "inherit"],
        shell: true,
      });

      process.on("SIGTERM", toExit);
      process.on("exit", toExit);
    },
  };
}

export default {
  input: "media/src/main.js",
  output: {
    sourcemap: false,
    format: "iife",
    name: "app",
    file: "media/mathplayground/build/bundle.js",
  },
  plugins: [
    svelte({
      compilerOptions: {
        // enable run-time checks when not in production
        dev: !production,
      },
      preprocess: [
        replace([
          [
            /(<Md?>)(.*?)(<\/Md?>)/gs,
            (match, p1, p2, p3) => {
              p2 = p2.replace(/{{{/g, "\u1234\u3432");
              p2 = p2.replace(/}}}/g, "\u3242\u17ab");
              p2 = p2.replace(/{/g, "&lbrace;");
              p2 = p2.replace(/}/g, "&rbrace;");
              p2 = p2.replace(/\u1234\u3432/g, "{");
              p2 = p2.replace(/\u3242\u17ab/g, "}");
              return p1 + p2 + p3;
            },
          ],
        ]),
      ],
    }),
    // we'll extract any component CSS out into
    // a separate file - better for performance
    css({ output: "bundle.css" }),

    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration -
    // consult the documentation for details:
    // https://github.com/rollup/plugins/tree/master/packages/commonjs
    resolve({
      browser: true,
      dedupe: ["svelte"],
    }),
    commonjs({ sourceMap: production }),
    production && terser(),

    // In dev mode, call `npm run start` once
    // the bundle has been generated
    !production && serve(),
    // Watch the `public` directory and refresh the
    // browser on changes when not in production
    !production && livereload("media/mathplayground/"),
  ],
  watch: {
    clearScreen: false,
  },
};
