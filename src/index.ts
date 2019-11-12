import * as github from '@actions/github';
import * as actionscore from '@actions/core';
import { Config } from './config';
import * as Octokit from "@octokit/rest";
import { readFileSync } from 'fs';

const config: Config = {
    FILTER: actionscore.getInput("filter", {
        required: false
    }),
    GITHUB_SECRET: actionscore.getInput("github_secret", {
        required: true
    })
};
const readPackage: () => any = () => {
    return readFileSync("./package.json").toJSON()
}
console.log("filter: ", config.FILTER)
console.log(github.context.action, github.context.eventName);
async function runa() {
    const githubClient: Octokit = new github.GitHub(config.GITHUB_SECRET) as any;
    if (github.context.action.localeCompare('push')) {
        const dd = readPackage();
        console.log("outa", dd);
        console.log("V", dd.version);
        const data = await githubClient.repos.createRelease({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            target_commitish: github.context.sha,
            draft: true,
            tag_name: "v" + dd.version,
            name: "Release " + dd.version
        });
        console.log(data);
    }
    if (github.context.action.localeCompare('pull_request')) {


        if (github.context.payload.pull_request) {
            const prData: any = github.context.payload.pull_request;
            const data = await githubClient.checks.create({
                owner: prData.user.login,
                repo: prData.head.repo.name,
                name: "require-label",
                head_sha: prData.head.sha,
                conclusion: prData.labels.length > 0 ? 'success' : 'failure'
            })
            const data2 = await githubClient.repos.requestPageBuild({
                owner: prData.user.login,
                repo: prData.head.repo.name
            })
            console.log(JSON.stringify(data))
            console.log(JSON.stringify(data2))
        } else {

            console.log("test");
            const payload = JSON.stringify(github.context.payload, undefined, 2);
            console.log(payload);
            actionscore.setOutput("T1", "T2");
            actionscore.setFailed("Bommel");
        }
    } else {
        actionscore.setFailed('This action can only be used on pull requests');
    }
}

runa().catch((err) => {
    console.error(err);
    actionscore.setFailed("Error");
}).then(() => {
    actionscore.info("Success");
})