import {Command, flags} from '@oclif/command'
import axios, {AxiosRequestConfig} from 'axios'
import {graphql} from '@octokit/graphql'
import cli from 'cli-ux'
import chalk from 'chalk'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as emoji from 'node-emoji'

class AreTheMaintainersDead extends Command {
  static description = 'describe the command here';

  static examples = ['$ are-the-maintainers-dead facebook react-native'];

  static required = true;

  static args = [{name: 'orgName'}, {name: 'repoName'}];

  static flags = {
    githubKey: flags.string({
      char: 'k',
      description: 'Github Access Key',
      required: false,
    }),
  };

  async run() {
    cli.action.start('Looking for the repository')

    const {flags, args} = this.parse(AreTheMaintainersDead)
    const orgName = args.orgName
    const repoName = args.repoName
    const newGithubKey = flags.githubKey

    // Search for user's Github access token. If not found, prompt user for it.
    const userConfig = path.join(this.config.configDir, 'config.json')
    if (!(await fs.pathExists(userConfig)) || newGithubKey) {
      let githubKey = newGithubKey
      if (!newGithubKey) {
        githubKey = await cli.prompt('What is your Github access token?')
      }
      await fs.outputJson(userConfig, {
        githubKey: githubKey,
      })
    }
    const {githubKey} = await fs.readJson(userConfig)
    const graphqlHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'bearer ' + githubKey,
        Accept: 'application/vnd.github.hawkgirl-preview',
      },
    }

    try {
      const {
        contributorCount,
        activeContributorCount,
      } = await this.getRepoContributors(orgName, repoName)

      const {
        openIssueCount,
        openStaleIssueCount,
        openPrCount,
        openStalePrCount,
        dependenciesCount,
      } = await this.getRepoInfo(graphqlHeaders, orgName, repoName)

      cli.action.stop('')
      cli.action.start('Calculating scores')

      const {
        organization,
        orgOpenIssueCount,
        orgOpenStaleIssueCount,
        orgOpenPrCount,
        orgOpenStalePrCount,
      } = await this.getOrgInfo(graphqlHeaders, orgName)

      const {qualityScore, maintenanceScore} = await this.getNpmsScores(
        repoName
      )

      // Scores
      const verifiedScore = organization.isVerified ? 10 * 0.2 : 0
      const orgScore: number =
        verifiedScore +
        this.getWeightedStaleScore(
          orgOpenStaleIssueCount / orgOpenIssueCount,
          0.4
        ) +
        this.getWeightedStaleScore(orgOpenStalePrCount / orgOpenPrCount, 0.4)

      const weightedOrgScore = orgScore * 0.25
      const weightedQualityScore = qualityScore * 0.15
      const weightedMaintenanceScore = maintenanceScore * 0.15
      const repoScore: number =
        this.getWeightedStaleScore(openStaleIssueCount / openIssueCount, 0.15) +
        this.getWeightedStaleScore(openStalePrCount / openPrCount, 0.15) +
        this.getWeightedActiveContributorsScore(
          activeContributorCount / contributorCount,
          0.15
        ) +
        weightedOrgScore +
        weightedQualityScore +
        weightedMaintenanceScore

      cli.action.stop('')

      // Log message
      this.log(`
--- SCOUTING -----

${orgName}/${repoName} has 
- ${chalk.blue.bold(openStaleIssueCount)} issues out of ${chalk.bold(
  openIssueCount
)} which are stale.
- ${chalk.blue.bold(openStalePrCount)} pull requests out of ${chalk.bold(
  openPrCount
)} which are stale.
*Pull requests and issues are marked as stale if they go 30 days without any activity.*

${orgName}/${repoName} has 
- ${chalk.blue.bold(dependenciesCount)} dependencies.
- ${chalk.blue.bold(activeContributorCount.toString())} out of ${chalk.bold(
  contributorCount
)} contributors which are active.

${repoName} is managed by ${chalk.blue.bold(
  orgName
)} which has an author score of ${chalk.underline(
  orgScore.toFixed(1)
)} out of 10

Community scout score for ${repoName} repository is ${chalk.underline(
  repoScore.toFixed(1)
)} out of 10 ${this.getEmoji(repoScore)}

7 - 10 ${emoji.get('fire')}
6 - 8 ${emoji.get('star2')}
4 - 6 ${emoji.get('ok_hand')}
2 - 4 ${emoji.get('exclamation')}
<2 ${emoji.get('face_vomiting')}
`)
    } catch (error) {
      this.error(
        'Double check the spelling of the organisation/ open-source repository!'
      )
    }
  }

  /**
   * Gets the repository's contributors using Github's REST API
   * @param {string} orgName The organisation's name
   * @param {string} repoName The repository's name
   * @returns {any} An object with the contributorCount and activeContributorCount
   */
  async getRepoContributors(orgName: string, repoName: string) {
    // Github's REST API
    const body: AxiosRequestConfig = {
      params: {
        type: 'public',
      },
    }

    const response = await axios.get(
      'https://api.github.com/repos/' +
        `${orgName}/${repoName}` +
        '/stats/contributors',
      body
    )
    const data = response.data
    const contributorCount = data.length
    let activeContributorCount = 0

    // For all contributors
    for (let i = 0; i < contributorCount; i++) {
      const contributorWeeks = data[i].weeks
      const contributorNumberOfWeeks = contributorWeeks.length

      // Check if the repo is less than 12 weeks old (3 months)
      // Hence all contributor's commits should be no more than 3 months old.
      if (contributorNumberOfWeeks <= 12) {
        activeContributorCount += 1
      } else {
        // Check if the contributor has any commits in the past 12 weeks
        let isActive = false
        for (let j = 1; j < 13 && !isActive; j++) {
          // eslint-disable-next-line max-depth
          if (contributorWeeks[contributorNumberOfWeeks - j].c > 0) {
            isActive = true
            activeContributorCount += 1
          }
        }
      }
    }
    return {
      contributorCount,
      activeContributorCount,
    }
  }

  /**
   * Gets the repository's info using Github's GraphQL API
   * @param {any} graphqlHeaders Headers to gain access to Github's GraphQL API
   * @param {string} orgName The organisation's name
   * @param {string} repoName The repository's name
   * @returns {any} An object with the openIssueCount, openStaleIssueCount, openPrCount,
   *                openStalePrCount, dependenciesCount,
   */
  async getRepoInfo(graphqlHeaders: any, orgName: string, repoName: string) {
    // Github's GraphQL API
    const {repository} = await graphql(
      `
    {
      repository(owner: "${orgName}", name: "${repoName}") {
        openPR: pullRequests (states: OPEN) {
          totalCount
        }
        openStalePR: pullRequests (states: OPEN, labels: "Stale") {
          totalCount
        }
        openIssues: issues (states: OPEN) {
          totalCount
        }
        openStaleIssues: issues (states: OPEN, labels: "Stale") {
          totalCount
        }
        dependencyGraphManifests {
            nodes {
              dependenciesCount
            }
        }
      }
    }
  `,
      graphqlHeaders
    )

    const openIssueCount = repository.openIssues.totalCount
    const openStaleIssueCount = repository.openStaleIssues.totalCount

    const openPrCount = repository.openPR.totalCount
    const openStalePrCount = repository.openStalePR.totalCount

    // Depedencies from the package.json file of the repo
    // Other results include package.json of examples, website, bots etc.
    const dependenciesCount =
      repository.dependencyGraphManifests.nodes[0].dependenciesCount

    return {
      openIssueCount,
      openStaleIssueCount,
      openPrCount,
      openStalePrCount,
      dependenciesCount,
    }
  }

  /**
   * Gets the organisation's info using Github's GraphQL API
   * @param {any} graphqlHeaders Headers to gain access to Github's GraphQL API
   * @param {string} orgName The organisation's name
   * @returns {any} An object with the organization, orgOpenIssueCount, orgOpenStaleIssueCount,
   *                orgOpenPrCount, orgOpenStalePrCount
   */
  async getOrgInfo(graphqlHeaders: any, orgName: string) {
    // Github's GraphQL API
    let hasNextPage = true
    let organization: any = null

    while (hasNextPage) {
      const afterParam =
        organization === null ?
          '' :
          `, after: "${organization.repositories.pageInfo.endCursor}"`
      // eslint-disable-next-line no-await-in-loop
      const furtherOrgInfo: any = await graphql(
        `
            {
              organization (login: "${orgName}") {
                isVerified
                repositories (first: 100 ${afterParam}) {
                  totalCount
                  pageInfo {
                    endCursor
                    hasNextPage
                  }
                  nodes {
                    orgOpenPR: pullRequests (states: OPEN) {
                      totalCount
                    }
                    orgOpenStalePR: pullRequests (states: OPEN, labels: "Stale") {
                      totalCount
                    }
                    orgOpenIssues: issues (states: OPEN) {
                      totalCount
                    }
                    orgOpenStaleIssues: issues (states: OPEN, labels: "Stale") {
                      totalCount
                    }
                  }
                }
              }
            }
          `,
        graphqlHeaders
      )

      if (organization === null) {
        organization = furtherOrgInfo.organization
      } else {
        // Concatenate the arrays with the organisation's repos
        organization.repositories.nodes = organization.repositories.nodes.concat(
          furtherOrgInfo.organization.repositories.nodes
        )
      }
      hasNextPage =
        furtherOrgInfo.organization.repositories.pageInfo.hasNextPage
      organization.repositories.pageInfo.endCursor =
        furtherOrgInfo.organization.repositories.pageInfo.endCursor
    }

    const orgRepos = organization.repositories.nodes
    const numOfOrgRepos = orgRepos.length
    let orgOpenIssueCount = 0
    let orgOpenStaleIssueCount = 0
    let orgOpenPrCount = 0
    let orgOpenStalePrCount = 0

    for (let i = 0; i < numOfOrgRepos; i++) {
      const currentRepo = orgRepos[i]
      orgOpenIssueCount += currentRepo.orgOpenIssues.totalCount
      orgOpenStaleIssueCount += currentRepo.orgOpenStaleIssues.totalCount
      orgOpenPrCount += currentRepo.orgOpenPR.totalCount
      orgOpenStalePrCount += currentRepo.orgOpenStalePR.totalCount
    }

    return {
      organization,
      orgOpenIssueCount,
      orgOpenStaleIssueCount,
      orgOpenPrCount,
      orgOpenStalePrCount,
    }
  }

  /**
   * Gets the npm info using NPMS's API. See
   * https://itnext.io/increasing-an-npm-packages-search-score-fb557f859300
   * for more info on the scoring.
   * @param {string} repoName The repository's name
   * @returns {any} An object with the qualityScore and maintenanceScore
   */
  async getNpmsScores(repoName: string) {
    const body: AxiosRequestConfig = {
      params: {
        name: repoName,
      },
    }

    const response = await axios.get(
      `https://api.npms.io/v2/package/${repoName}`,
      body
    )

    const data = response.data
    const qualityScore = data.score.detail.quality * 10
    const maintenanceScore = data.score.detail.maintenance * 10

    return {
      qualityScore,
      maintenanceScore,
    }
  }

  /**
   * Return the weighted score of stale issues and pull requests
   * @param {number} percentage The percentage of stale issues/ PRs
   * @param {number} weightage The weightage of this score
   * @returns {number} The weighted score
   */
  getWeightedStaleScore(percentage: number, weightage: number): number {
    const perct = percentage * 100
    if (perct > 10) return 0 * weightage
    if (perct > 8) return 2 * weightage
    if (perct > 6) return 4 * weightage
    if (perct > 4) return 6 * weightage
    if (perct > 2) return 8 * weightage
    return 10 * weightage
  }

  /**
   * Return the weighted score of active contributors
   * @param {number} percentage The percentage of stale issues/ PRs
   * @param {number} weightage The weightage of this score
   * @returns {number} The weighted score
   */
  getWeightedActiveContributorsScore(
    percentage: number,
    weightage: number
  ): number {
    const perct = percentage * 100
    if (perct > 20) return 10 * weightage
    if (perct > 15) return 8 * weightage
    if (perct > 10) return 6 * weightage
    if (perct > 5) return 4 * weightage
    if (perct > 0) return 2 * weightage
    return 0 * weightage
  }

  getEmoji(score: number) {
    if (score > 7) return emoji.get('fire')
    if (score > 6) return emoji.get('star2')
    if (score > 4) return emoji.get('ok_hand')
    if (score > 2) return emoji.get('exclamation')
    return emoji.get('face_vomiting')
  }
}

export = AreTheMaintainersDead;
