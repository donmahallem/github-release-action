/*!
 * Source https://github.com/donmahallem/github-release-action
 */

import * as actionscore from "@actions/core";
import * as github from "@actions/github";
import * as Octokit from "@octokit/rest";
import { readFileSync } from "fs";
import { IConfig } from "./config";

const config: IConfig = {
    FILTER: actionscore.getInput("filter", {
        required: false,
    }),
    GITHUB_SECRET: actionscore.getInput("github_secret", {
        required: true,
    }),
};
const readPackage: () => any = () =>
    JSON.parse(readFileSync("./package.json", "utf-8"));
const runa = async () => {
    const githubClient: Octokit = new github.GitHub(config.GITHUB_SECRET) as any;
    if (github.context.action.localeCompare("push")) {
        const packageInfo: {
            name: string,
            version: string,
        } = readPackage();
        const releases: Octokit.Response<Octokit.ReposListReleasesResponse> = await githubClient.repos.listReleases({
            owner: github.context.repo.owner,
            page: 100,
            repo: github.context.repo.repo,
        });
        const filteredReleases: Octokit.ReposListReleasesResponseItem[] = releases.data
            .filter((value: Octokit.ReposListReleasesResponseItem) =>
                value.tag_name === "v" + packageInfo.version);
        if (filteredReleases.length > 0) {
            actionscore.info("Updating Release");
            const resp: any = await githubClient.repos.updateRelease({
                owner: github.context.repo.owner,
                release_id: filteredReleases[0].id,
                repo: github.context.repo.repo,
                target_commitish: github.context.sha,
            });
            actionscore.info("Done");
            actionscore.info("Update Release: " + resp.data.id);
        } else {
            const data = await githubClient.repos.createRelease({
                draft: true,
                name: "Release " + packageInfo.version,
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                tag_name: "v" + packageInfo.version,
                target_commitish: github.context.sha,
            });
            actionscore.info("Create Release: " + data.data.id);
        }
    }
};

runa().catch((err) => {
    actionscore.error(err);
    actionscore.setFailed("Error");
}).then(() => {
    actionscore.info("Success");
});
