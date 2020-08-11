# orders-simulation

A real-time kitchen delivery order fulfillment system emulator.

## Getting Started

### Setup for [Mac OS][macos]

1.  Install [Xcode][xcode] from the Mac App Store
    -   [itunes.apple.com/us/app/xcode/id497799835][xcode-app]
2.  Install [Xcode][xcode] Command Line Tools
    -   `sudo xcodebuild -license accept`
    -   `xcode-select --install`
3.  Install [NVM][nvm]
    -   github.com/creationix/nvm
4.  Install [Node.js][nodejs] via [NVM][nvm]
    -   `nvm i v14`
    -   `nvm alias default v14`
5.  Install [NPM][npm] via [NVM][nvm]
    -   `nvm install-latest-npm`
6.  Install project dependencies
    -   `npm i`

### Run on [Mac OS][macos]

-   Execute tests via [NPM][npm]
    -   `npm test`
-   See command line options via [NPM][npm]
    -   `npm start -- --help`

* * *

## Configuration

### Environment file

Create a key-value file _~/.env_ as an alternative to environment
variables for ease-of-use.

```
NODE_ENV=production
APP_LOG_LEVEL=debug
…
```

### Process Environment

See [Node.js][nodejs] documentation of [process.env][processenv].

Key               | Type      | Default  | Description
----------------- | --------- | -------- | -----------
APP_LOG_LEVEL     | `String`  | `"info"` | The level of log entries to display. May be `"error"`, `"info"`, `"debug"`, or `"silly"`.

* * *

[macos]: https://developer.apple.com/macos/ "Mac OS"

[nodejs]: https://nodejs.org/en/ "Node.js"

[nvm]: https://github.com/creationix/nvm "NVM"

[npm]: https://npmjs.org/ "NPM"

[xcode]: https://developer.apple.com/xcode/ "Xcode"

[xcode-app]: https://itunes.apple.com/us/app/xcode/id497799835 "Xcode"

[processenv]: https://nodejs.org/dist/latest/docs/api/process.html#process_process_env "process.env"
