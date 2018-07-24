const chalk = require('chalk')
const config = require('./config')

console.log(chalk.yellow('Your github token is:'))
console.info(chalk.yellow(config.GITHUB_PERSONAL_ACCESS_TOKEN))