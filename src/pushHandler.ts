import { Client, Context, Config, PushPayload } from './types'
import isEnabledForPR from './isEnabledForPR'
import { AnyResponse } from '@octokit/rest';

export default async function pushHandler(
    client: Client,
    context: Context,
    config: Config,
) {
    const payload = context.payload as PushPayload
    const components = payload.ref.split('/')
    const branchName = components[components.length - 1]
    const openedPrs = await client.pulls.list({
        ...context.repo,
        state: 'open',
        base: branchName,
    })
    console.log('opened prs', openedPrs)
    await Promise.all(
        openedPrs.data.map((pr) => {
            if (!isEnabledForPR(pr, config.whitelist, config.blacklist)) {
                return
            }
            return client.pulls.updateBranch({
                ...context.repo,
                pull_number: pr.number,
                expected_head_sha: pr.head.sha,
            }).catch((error) => {
                console.log('error updating pr', pr.number)
                const labels = pr.labels.map((label) => label.name).filter((label) => config.whitelist.includes(label))
                const tasks: Promise<AnyResponse>[] = labels.map((label) =>
                    client.issues.removeLabel({
                        ...context.repo,
                        issue_number: pr.number,
                        name: label
                    }))
                tasks.push(client.issues.createComment({
                    ...context.repo,
                    issue_number: pr.number,
                    body: 'Could not update branch. Most likely this is due to a ' +
                          'merge conflict. Please update the branch manually and ' +
                          'fix any issues.'
                }))
                return Promise.all(tasks)
            })
        }),
    )
}
