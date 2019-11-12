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
    return JSON.parse(readFileSync("./package.json", "utf-8"));
}
console.log("filter: ", config.FILTER, config.GITHUB_SECRET.substr(0, 8));
console.log(github.context.action, github.context.eventName);
async function runa() {
    const githubClient: Octokit = new github.GitHub(config.GITHUB_SECRET) as any;
    if (github.context.action.localeCompare('push')) {
        const packageInfo: {
            version: string,
            name: string
        } = readPackage();
        const releases: Octokit.Response<Octokit.ReposListReleasesResponse> = await githubClient.repos.listReleases({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            page: 100
        });
        const tags: string[] = releases.data.map((value) => {
            return value.tag_name;
        });
        console.log(tags, releases.data, await githubClient.repos.getReleaseByTag({
            tag: "v0.0.1",
            owner: github.context.repo.owner,
            repo: github.context.repo.repo
        }));
        const filteredReleases: Octokit.ReposListReleasesResponseItem[] = releases.data
            .filter((value: Octokit.ReposListReleasesResponseItem) => {
                return value.tag_name === "v" + packageInfo.version;
            });
        if (filteredReleases.length > 0) {
            actionscore.info("Updating Release");
            const resp: any = await githubClient.repos.updateRelease({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                release_id: filteredReleases[0].id,
                target_commitish: github.context.sha
            })
            actionscore.info("Done");
            actionscore.info("Update Release: " + resp.data.id);
        } else {
            const data = await githubClient.repos.createRelease({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                target_commitish: github.context.sha,
                draft: true,
                tag_name: "v" + packageInfo.version,
                name: "Release " + packageInfo.version
            });
            actionscore.info("Create Release: " + data.data.id);
        }
    }
}

runa().catch((err) => {
    console.error(err);
    actionscore.setFailed("Error");
}).then(() => {
    actionscore.info("Success");
})