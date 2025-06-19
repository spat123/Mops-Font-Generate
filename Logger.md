[10:24:41.851] Running build in Washington, D.C., USA (East) – iad1
[10:24:41.852] Build machine configuration: 2 cores, 8 GB
[10:24:41.867] Retrieving list of deployment files...
[10:24:42.010] Previous build caches not available
[10:24:42.320] Downloading 954 deployment files...
[10:24:46.501] Running "vercel build"
[10:24:46.985] Vercel CLI 43.1.0
[10:24:47.751] Installing dependencies...
[10:24:57.266] 
[10:24:57.267] added 66 packages in 9s
[10:24:57.268] 
[10:24:57.268] 16 packages are looking for funding
[10:24:57.269]   run `npm fund` for details
[10:24:57.315] Running "npm run build"
[10:24:57.426] 
[10:24:57.427] > font-gauntlet-clone@1.0.0 build
[10:24:57.427] > next build
[10:24:57.427] 
[10:24:57.968]  ⚠ Invalid next.config.js options detected: 
[10:24:57.969]  ⚠     Unrecognized key(s) in object: 'api'
[10:24:57.969]  ⚠ See more info here: https://nextjs.org/docs/messages/invalid-next-config
[10:24:57.977] Attention: Next.js now collects completely anonymous telemetry regarding usage.
[10:24:57.979] This information is used to shape Next.js' roadmap and prioritize features.
[10:24:57.980] You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
[10:24:57.981] https://nextjs.org/telemetry
[10:24:57.981] 
[10:24:58.031]   ▲ Next.js 14.2.28
[10:24:58.031] 
[10:24:58.032]    Linting and checking validity of types ...
[10:24:58.204]    Creating an optimized production build ...
[10:25:07.656] Failed to compile.
[10:25:07.657] 
[10:25:07.657] ./node_modules/react-toastify/dist/ReactToastify.css.webpack[javascript/auto]!=!./node_modules/next/dist/build/webpack/loaders/css-loader/src/index.js??ruleSet[1].rules[7].oneOf[12].use[1]!./node_modules/next/dist/build/webpack/loaders/postcss-loader/src/index.js??ruleSet[1].rules[7].oneOf[12].use[2]!./node_modules/react-toastify/dist/ReactToastify.css
[10:25:07.658] Error: Cannot find module '../lightningcss.linux-x64-gnu.node'
[10:25:07.658] Require stack:
[10:25:07.658] - /vercel/path0/node_modules/lightningcss/node/index.js
[10:25:07.659] - /vercel/path0/node_modules/@tailwindcss/node/dist/index.js
[10:25:07.659] - /vercel/path0/node_modules/@tailwindcss/postcss/dist/index.js
[10:25:07.659] - /vercel/path0/node_modules/next/dist/build/webpack/config/blocks/css/plugins.js
[10:25:07.660] - /vercel/path0/node_modules/next/dist/build/webpack/config/blocks/css/index.js
[10:25:07.660] - /vercel/path0/node_modules/next/dist/build/webpack/config/index.js
[10:25:07.660] - /vercel/path0/node_modules/next/dist/build/webpack-config.js
[10:25:07.661] - /vercel/path0/node_modules/next/dist/build/webpack-build/impl.js
[10:25:07.661] - /vercel/path0/node_modules/next/dist/compiled/jest-worker/processChild.js
[10:25:07.662]     at Function.<anonymous> (node:internal/modules/cjs/loader:1401:15)
[10:25:07.662]     at /vercel/path0/node_modules/next/dist/server/require-hook.js:55:36
[10:25:07.662]     at defaultResolveImpl (node:internal/modules/cjs/loader:1057:19)
[10:25:07.662]     at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1062:22)
[10:25:07.663]     at Function._load (node:internal/modules/cjs/loader:1211:37)
[10:25:07.663]     at TracingChannel.traceSync (node:diagnostics_channel:322:14)
[10:25:07.663]     at wrapModuleLoad (node:internal/modules/cjs/loader:235:24)
[10:25:07.664]     at Module.<anonymous> (node:internal/modules/cjs/loader:1487:12)
[10:25:07.664]     at mod.require (/vercel/path0/node_modules/next/dist/server/require-hook.js:65:28)
[10:25:07.664]     at require (node:internal/modules/helpers:135:16)
[10:25:07.665] 
[10:25:07.665] Import trace for requested module:
[10:25:07.665] ./node_modules/react-toastify/dist/ReactToastify.css.webpack[javascript/auto]!=!./node_modules/next/dist/build/webpack/loaders/css-loader/src/index.js??ruleSet[1].rules[7].oneOf[12].use[1]!./node_modules/next/dist/build/webpack/loaders/postcss-loader/src/index.js??ruleSet[1].rules[7].oneOf[12].use[2]!./node_modules/react-toastify/dist/ReactToastify.css
[10:25:07.665] ./node_modules/react-toastify/dist/ReactToastify.css
[10:25:07.666] 
[10:25:07.666] ./styles/globals.css.webpack[javascript/auto]!=!./node_modules/next/dist/build/webpack/loaders/css-loader/src/index.js??ruleSet[1].rules[7].oneOf[14].use[1]!./node_modules/next/dist/build/webpack/loaders/postcss-loader/src/index.js??ruleSet[1].rules[7].oneOf[14].use[2]!./styles/globals.css
[10:25:07.666] Error: Cannot find module '../lightningcss.linux-x64-gnu.node'
[10:25:07.667] Require stack:
[10:25:07.667] - /vercel/path0/node_modules/lightningcss/node/index.js
[10:25:07.667] - /vercel/path0/node_modules/@tailwindcss/node/dist/index.js
[10:25:07.668] - /vercel/path0/node_modules/@tailwindcss/postcss/dist/index.js
[10:25:07.668] - /vercel/path0/node_modules/next/dist/build/webpack/config/blocks/css/plugins.js
[10:25:07.668] - /vercel/path0/node_modules/next/dist/build/webpack/config/blocks/css/index.js
[10:25:07.668] - /vercel/path0/node_modules/next/dist/build/webpack/config/index.js
[10:25:07.669] - /vercel/path0/node_modules/next/dist/build/webpack-config.js
[10:25:07.669] - /vercel/path0/node_modules/next/dist/build/webpack-build/impl.js
[10:25:07.669] - /vercel/path0/node_modules/next/dist/compiled/jest-worker/processChild.js
[10:25:07.670]     at Function.<anonymous> (node:internal/modules/cjs/loader:1401:15)
[10:25:07.670]     at /vercel/path0/node_modules/next/dist/server/require-hook.js:55:36
[10:25:07.670]     at defaultResolveImpl (node:internal/modules/cjs/loader:1057:19)
[10:25:07.672]     at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1062:22)
[10:25:07.672]     at Function._load (node:internal/modules/cjs/loader:1211:37)
[10:25:07.672]     at TracingChannel.traceSync (node:diagnostics_channel:322:14)
[10:25:07.673]     at wrapModuleLoad (node:internal/modules/cjs/loader:235:24)
[10:25:07.673]     at Module.<anonymous> (node:internal/modules/cjs/loader:1487:12)
[10:25:07.673]     at mod.require (/vercel/path0/node_modules/next/dist/server/require-hook.js:65:28)
[10:25:07.673]     at require (node:internal/modules/helpers:135:16)
[10:25:07.673] 
[10:25:07.673] Import trace for requested module:
[10:25:07.674] ./styles/globals.css.webpack[javascript/auto]!=!./node_modules/next/dist/build/webpack/loaders/css-loader/src/index.js??ruleSet[1].rules[7].oneOf[14].use[1]!./node_modules/next/dist/build/webpack/loaders/postcss-loader/src/index.js??ruleSet[1].rules[7].oneOf[14].use[2]!./styles/globals.css
[10:25:07.674] ./styles/globals.css
[10:25:07.674] 
[10:25:07.674] ./node_modules/react-toastify/dist/ReactToastify.css
[10:25:07.675] Error: Cannot find module '../lightningcss.linux-x64-gnu.node'
[10:25:07.675] Require stack:
[10:25:07.675] - /vercel/path0/node_modules/lightningcss/node/index.js
[10:25:07.675] - /vercel/path0/node_modules/@tailwindcss/node/dist/index.js
[10:25:07.675] - /vercel/path0/node_modules/@tailwindcss/postcss/dist/index.js
[10:25:07.675] - /vercel/path0/node_modules/next/dist/build/webpack/config/blocks/css/plugins.js
[10:25:07.675] - /vercel/path0/node_modules/next/dist/build/webpack/config/blocks/css/index.js
[10:25:07.675] - /vercel/path0/node_modules/next/dist/build/webpack/config/index.js
[10:25:07.675] - /vercel/path0/node_modules/next/dist/build/webpack-config.js
[10:25:07.675] - /vercel/path0/node_modules/next/dist/build/webpack-build/impl.js
[10:25:07.675] - /vercel/path0/node_modules/next/dist/compiled/jest-worker/processChild.js
[10:25:07.675]     at Function.<anonymous> (node:internal/modules/cjs/loader:1401:15)
[10:25:07.675]     at /vercel/path0/node_modules/next/dist/server/require-hook.js:55:36
[10:25:07.675]     at defaultResolveImpl (node:internal/modules/cjs/loader:1057:19)
[10:25:07.675]     at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1062:22)
[10:25:07.676]     at Function._load (node:internal/modules/cjs/loader:1211:37)
[10:25:07.676]     at TracingChannel.traceSync (node:diagnostics_channel:322:14)
[10:25:07.676]     at wrapModuleLoad (node:internal/modules/cjs/loader:235:24)
[10:25:07.676]     at Module.<anonymous> (node:internal/modules/cjs/loader:1487:12)
[10:25:07.676]     at mod.require (/vercel/path0/node_modules/next/dist/server/require-hook.js:65:28)
[10:25:07.676]     at require (node:internal/modules/helpers:135:16)
[10:25:07.676]     at tryRunOrWebpackError (/vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:312989)
[10:25:07.676]     at __webpack_require_module__ (/vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:131165)
[10:25:07.676]     at __nested_webpack_require_153728__ (/vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:130607)
[10:25:07.676]     at /vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:131454
[10:25:07.676]     at symbolIterator (/vercel/path0/node_modules/next/dist/compiled/neo-async/async.js:1:14444)
[10:25:07.676]     at done (/vercel/path0/node_modules/next/dist/compiled/neo-async/async.js:1:14824)
[10:25:07.676]     at Hook.eval [as callAsync] (eval at create (/vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:13:28858), <anonymous>:15:1)
[10:25:07.676]     at /vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:130328
[10:25:07.676]     at symbolIterator (/vercel/path0/node_modules/next/dist/compiled/neo-async/async.js:1:14402)
[10:25:07.676]     at timesSync (/vercel/path0/node_modules/next/dist/compiled/neo-async/async.js:1:5027)
[10:25:07.676] -- inner error --
[10:25:07.676] Error: Cannot find module '../lightningcss.linux-x64-gnu.node'
[10:25:07.676] Require stack:
[10:25:07.676] - /vercel/path0/node_modules/lightningcss/node/index.js
[10:25:07.676] - /vercel/path0/node_modules/@tailwindcss/node/dist/index.js
[10:25:07.676] - /vercel/path0/node_modules/@tailwindcss/postcss/dist/index.js
[10:25:07.676] - /vercel/path0/node_modules/next/dist/build/webpack/config/blocks/css/plugins.js
[10:25:07.676] - /vercel/path0/node_modules/next/dist/build/webpack/config/blocks/css/index.js
[10:25:07.676] - /vercel/path0/node_modules/next/dist/build/webpack/config/index.js
[10:25:07.677] - /vercel/path0/node_modules/next/dist/build/webpack-config.js
[10:25:07.677] - /vercel/path0/node_modules/next/dist/build/webpack-build/impl.js
[10:25:07.684] - /vercel/path0/node_modules/next/dist/compiled/jest-worker/processChild.js
[10:25:07.684]     at Function.<anonymous> (node:internal/modules/cjs/loader:1401:15)
[10:25:07.684]     at /vercel/path0/node_modules/next/dist/server/require-hook.js:55:36
[10:25:07.684]     at defaultResolveImpl (node:internal/modules/cjs/loader:1057:19)
[10:25:07.684]     at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1062:22)
[10:25:07.684]     at Function._load (node:internal/modules/cjs/loader:1211:37)
[10:25:07.690]     at TracingChannel.traceSync (node:diagnostics_channel:322:14)
[10:25:07.690]     at wrapModuleLoad (node:internal/modules/cjs/loader:235:24)
[10:25:07.691]     at Module.<anonymous> (node:internal/modules/cjs/loader:1487:12)
[10:25:07.691]     at mod.require (/vercel/path0/node_modules/next/dist/server/require-hook.js:65:28)
[10:25:07.691]     at require (node:internal/modules/helpers:135:16)
[10:25:07.691]     at Object.<anonymous> (/vercel/path0/node_modules/next/dist/build/webpack/loaders/css-loader/src/index.js??ruleSet[1].rules[7].oneOf[12].use[1]!/vercel/path0/node_modules/next/dist/build/webpack/loaders/postcss-loader/src/index.js??ruleSet[1].rules[7].oneOf[12].use[2]!/vercel/path0/node_modules/react-toastify/dist/ReactToastify.css:1:7)
[10:25:07.691]     at /vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:922493
[10:25:07.691]     at Hook.eval [as call] (eval at create (/vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:13:28636), <anonymous>:7:1)
[10:25:07.691]     at /vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:131198
[10:25:07.691]     at tryRunOrWebpackError (/vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:312943)
[10:25:07.691]     at __webpack_require_module__ (/vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:131165)
[10:25:07.691]     at __nested_webpack_require_153728__ (/vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:130607)
[10:25:07.691]     at /vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:131454
[10:25:07.691]     at symbolIterator (/vercel/path0/node_modules/next/dist/compiled/neo-async/async.js:1:14444)
[10:25:07.691]     at done (/vercel/path0/node_modules/next/dist/compiled/neo-async/async.js:1:14824)
[10:25:07.691] 
[10:25:07.691] Generated code for /vercel/path0/node_modules/next/dist/build/webpack/loaders/css-loader/src/index.js??ruleSet[1].rules[7].oneOf[12].use[1]!/vercel/path0/node_modules/next/dist/build/webpack/loaders/postcss-loader/src/index.js??ruleSet[1].rules[7].oneOf[12].use[2]!/vercel/path0/node_modules/react-toastify/dist/ReactToastify.css
[10:25:07.691] 
[10:25:07.691] Import trace for requested module:
[10:25:07.691] ./node_modules/react-toastify/dist/ReactToastify.css
[10:25:07.691] 
[10:25:07.691] ./styles/globals.css
[10:25:07.691] Error: Cannot find module '../lightningcss.linux-x64-gnu.node'
[10:25:07.691] Require stack:
[10:25:07.691] - /vercel/path0/node_modules/lightningcss/node/index.js
[10:25:07.691] - /vercel/path0/node_modules/@tailwindcss/node/dist/index.js
[10:25:07.691] - /vercel/path0/node_modules/@tailwindcss/postcss/dist/index.js
[10:25:07.691] - /vercel/path0/node_modules/next/dist/build/webpack/config/blocks/css/plugins.js
[10:25:07.691] - /vercel/path0/node_modules/next/dist/build/webpack/config/blocks/css/index.js
[10:25:07.691] - /vercel/path0/node_modules/next/dist/build/webpack/config/index.js
[10:25:07.691] - /vercel/path0/node_modules/next/dist/build/webpack-config.js
[10:25:07.691] - /vercel/path0/node_modules/next/dist/build/webpack-build/impl.js
[10:25:07.691] - /vercel/path0/node_modules/next/dist/compiled/jest-worker/processChild.js
[10:25:07.691]     at Function.<anonymous> (node:internal/modules/cjs/loader:1401:15)
[10:25:07.691]     at /vercel/path0/node_modules/next/dist/server/require-hook.js:55:36
[10:25:07.691]     at defaultResolveImpl (node:internal/modules/cjs/loader:1057:19)
[10:25:07.691]     at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1062:22)
[10:25:07.691]     at Function._load (node:internal/modules/cjs/loader:1211:37)
[10:25:07.692]     at TracingChannel.traceSync (node:diagnostics_channel:322:14)
[10:25:07.692]     at wrapModuleLoad (node:internal/modules/cjs/loader:235:24)
[10:25:07.692]     at Module.<anonymous> (node:internal/modules/cjs/loader:1487:12)
[10:25:07.692]     at mod.require (/vercel/path0/node_modules/next/dist/server/require-hook.js:65:28)
[10:25:07.692]     at require (node:internal/modules/helpers:135:16)
[10:25:07.692]     at tryRunOrWebpackError (/vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:312989)
[10:25:07.692]     at __webpack_require_module__ (/vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:131165)
[10:25:07.692]     at __nested_webpack_require_153728__ (/vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:130607)
[10:25:07.692]     at /vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:131454
[10:25:07.692]     at symbolIterator (/vercel/path0/node_modules/next/dist/compiled/neo-async/async.js:1:14444)
[10:25:07.692]     at done (/vercel/path0/node_modules/next/dist/compiled/neo-async/async.js:1:14824)
[10:25:07.692]     at Hook.eval [as callAsync] (eval at create (/vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:13:28858), <anonymous>:15:1)
[10:25:07.692]     at Hook.CALL_ASYNC_DELEGATE [as _callAsync] (/vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:13:26012)
[10:25:07.692]     at /vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:130328
[10:25:07.692]     at symbolIterator (/vercel/path0/node_modules/next/dist/compiled/neo-async/async.js:1:14402)
[10:25:07.692] -- inner error --
[10:25:07.692] Error: Cannot find module '../lightningcss.linux-x64-gnu.node'
[10:25:07.692] Require stack:
[10:25:07.692] - /vercel/path0/node_modules/lightningcss/node/index.js
[10:25:07.692] - /vercel/path0/node_modules/@tailwindcss/node/dist/index.js
[10:25:07.692] - /vercel/path0/node_modules/@tailwindcss/postcss/dist/index.js
[10:25:07.693] - /vercel/path0/node_modules/next/dist/build/webpack/config/blocks/css/plugins.js
[10:25:07.693] - /vercel/path0/node_modules/next/dist/build/webpack/config/blocks/css/index.js
[10:25:07.693] - /vercel/path0/node_modules/next/dist/build/webpack/config/index.js
[10:25:07.693] - /vercel/path0/node_modules/next/dist/build/webpack-config.js
[10:25:07.693] - /vercel/path0/node_modules/next/dist/build/webpack-build/impl.js
[10:25:07.693] - /vercel/path0/node_modules/next/dist/compiled/jest-worker/processChild.js
[10:25:07.693]     at Function.<anonymous> (node:internal/modules/cjs/loader:1401:15)
[10:25:07.693]     at /vercel/path0/node_modules/next/dist/server/require-hook.js:55:36
[10:25:07.693]     at defaultResolveImpl (node:internal/modules/cjs/loader:1057:19)
[10:25:07.693]     at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1062:22)
[10:25:07.693]     at Function._load (node:internal/modules/cjs/loader:1211:37)
[10:25:07.693]     at TracingChannel.traceSync (node:diagnostics_channel:322:14)
[10:25:07.693]     at wrapModuleLoad (node:internal/modules/cjs/loader:235:24)
[10:25:07.693]     at Module.<anonymous> (node:internal/modules/cjs/loader:1487:12)
[10:25:07.693]     at mod.require (/vercel/path0/node_modules/next/dist/server/require-hook.js:65:28)
[10:25:07.693]     at require (node:internal/modules/helpers:135:16)
[10:25:07.693]     at Object.<anonymous> (/vercel/path0/node_modules/next/dist/build/webpack/loaders/css-loader/src/index.js??ruleSet[1].rules[7].oneOf[14].use[1]!/vercel/path0/node_modules/next/dist/build/webpack/loaders/postcss-loader/src/index.js??ruleSet[1].rules[7].oneOf[14].use[2]!/vercel/path0/styles/globals.css:1:7)
[10:25:07.694]     at /vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:922493
[10:25:07.694]     at Hook.eval [as call] (eval at create (/vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:13:28636), <anonymous>:7:1)
[10:25:07.695]     at Hook.CALL_DELEGATE [as _call] (/vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:13:25906)
[10:25:07.695]     at /vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:131198
[10:25:07.695]     at tryRunOrWebpackError (/vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:312943)
[10:25:07.695]     at __webpack_require_module__ (/vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:131165)
[10:25:07.695]     at __nested_webpack_require_153728__ (/vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:130607)
[10:25:07.695]     at /vercel/path0/node_modules/next/dist/compiled/webpack/bundle5.js:28:131454
[10:25:07.696]     at symbolIterator (/vercel/path0/node_modules/next/dist/compiled/neo-async/async.js:1:14444)
[10:25:07.696] 
[10:25:07.696] Generated code for /vercel/path0/node_modules/next/dist/build/webpack/loaders/css-loader/src/index.js??ruleSet[1].rules[7].oneOf[14].use[1]!/vercel/path0/node_modules/next/dist/build/webpack/loaders/postcss-loader/src/index.js??ruleSet[1].rules[7].oneOf[14].use[2]!/vercel/path0/styles/globals.css
[10:25:07.696] 
[10:25:07.696] Import trace for requested module:
[10:25:07.696] ./styles/globals.css
[10:25:07.696] 
[10:25:07.705] 
[10:25:07.705] > Build failed because of webpack errors
[10:25:07.721] Error: Command "npm run build" exited with 1
[10:25:08.253] 
[10:25:11.465] Exiting build container