'use strict'

const cliSpinner = require('cli-spinner')

function spinner(text = 'loading..') {
  const spinner = new cliSpinner(`${text} %s`)
  spinner.setSpinnerString('|/-\\')
  return spinner
}

module.exports = spinner
