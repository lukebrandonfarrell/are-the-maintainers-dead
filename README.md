are-the-maintainers-dead
========================

CLI tool that generates a score for an open-source repository based on factors such as issues, stale issues and dependencies etc.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/are-the-maintainers-dead.svg)](https://npmjs.org/package/are-the-maintainers-dead)
[![Downloads/week](https://img.shields.io/npm/dw/are-the-maintainers-dead.svg)](https://npmjs.org/package/are-the-maintainers-dead)
[![License](https://img.shields.io/npm/l/are-the-maintainers-dead.svg)](https://github.com/aspect-apps/are-the-maintainers-dead/blob/master/package.json)


The CLI tool fetches data from the Github API and GraphQL API, which requires a Github access key. You only have to input your access key once and it will be saved in a config file for subsequent searches.

[Create a personal access token](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token) if you do not have one.
Do request for the following scopes when creating a token:
```
user
public_repo
repo
repo_deployment
repo:status
read:repo_hook
read:org
read:public_key
read:gpg_key
```

<!-- toc -->
* [Install](#install)
* [Usage](#usage)
<!-- tocstop -->
# Install
<!-- install -->
```sh-session
$ npm install -g are-the-maintainers-dead
```
<!-- installstop -->

# Usage
<!-- usage -->
```sh-session
$ npm install -g are-the-maintainers-dead
$ are-the-maintainers-dead COMMAND
running command...
$ are-the-maintainers-dead (-v|--version|version)
are-the-maintainers-dead/0.0.1 darwin-x64 node-v14.15.4
$ are-the-maintainers-dead --help [COMMAND]
USAGE
  $ are-the-maintainers-dead COMMAND
...
```
<!-- usagestop -->
