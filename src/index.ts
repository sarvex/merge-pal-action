import * as github from '@actions/github'
import * as core from '@actions/core'
import main from './main'

main(core, github).catch((error: Error) => {
    console.log("Failed to merge!", error.message)
    console.log(error)
})
