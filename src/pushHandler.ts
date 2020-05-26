import { Client, Context, Config, PushPayload } from './types'
import isEnabledForPR from './isEnabledForPR'

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
                return client.issues.createComment({
                    ...context.repo,
                    issue_number: pr.number,
                    body: 'Could not update branch, possible merge conflict'
                })
            })
        }),
    )
}
