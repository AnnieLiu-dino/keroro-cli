'use strict'

const { Spinner } = require('cli-spinner')

function start(msg, spinnerString = '|/-\\') {
    const spinner = new Spinner(msg + ' %s')
    spinner.setSpinnerString(spinnerString)
    spinner.start()
    return spinner
}

function stop(spinner) {
    spinner.stop(true)
    console.log() // 隔一行
}
module.exports = {
    start,
    stop,
}
