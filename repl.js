'use strict';

if (require.main === module) {
  const dotenv = require('dotenv');
  const result = dotenv.config();
  const repl = require('repl');
  const chalk = require('chalk');
  const PrettyError = require('pretty-error');
  const lib = require('lib');
  const prettyError = new PrettyError();
  const template = chalk.dim('%s\n%s');
  const logger = lib.winston.get(__filename);
  const { name, version } = require('package.json');

  /**
   * A map of relevant populated environment variables.
   */
  const env = ((keys) => {
    const env = Object.create(null);

    for (let key of keys) {
      if (key in process.env) {
        env[key] = process.env[key];
      }
    }

    return env;
  })([
    'NODE_PATH',
    'NODE_ENV',
    'APP_LOG_COLOR',
    'APP_LOG_PRETTY',
    'APP_LOG_TIMESTAMP'
  ]);

  /**
   * Transform {@linkcode values} in to a {@linkcode String} for logging.
   * @argument {Array} values
   * @return {String}
   */
  const toString = (values) =>
    values
      .map((v, i) =>
        `${values.length === 1 ? '━' : i === 0 ? '┏' : i === values.length - 1 ? '┗' : '┣'} ${v}\n`
      )
      .join('');

  console.log(chalk.dim(`\n${name} v${version}\n`));

  for (let transport of logger.transports) {
    if (transport.filename !== 'stderr.log') {
      logger.remove(transport);
    }
  }

  prettyError.alias(lib.relquire.base, '.');
  prettyError.skipNodeFiles();
  prettyError.start();
  process.on('unhandledRejection', (err) => {
    logger.error('%s', 'unhandledRejection', {
      message: err.message,
      code: err.code
    });
    console.error(prettyError.render(err));
  });

  if (Object.entries(env).length > 0) {
    const values = Object
      .entries(env)
      .map((v) => `${v[0]} = ${chalk.white(v[1])}`);

    console.log(template, 'Environment', toString(values));
  }

  console.log(template, 'Symbols', toString(Object.keys(lib)));

  if (result.error != null) {
    console.warn(result.error);
  }

  const replServer = module.exports = repl.start({
    ignoreUndefined: true,
    breakEvalOnSigint: true
  });

  const initialize = (context) => Object.assign(context, { replServer }, lib);

  replServer.on('reset', initialize);

  initialize(replServer.context);
}