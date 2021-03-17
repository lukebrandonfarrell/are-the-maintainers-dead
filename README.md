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
$ are-the-maintainers-dead [ORGNAME] [REPONAME] -k [YOUR GITHUB ACCESS KEY]
e.g. are-the-maintainers-dead facebook react-native -k 012abcd34567e8910fg123h45i6j7k89lm1n0opq

$ are-the-maintainers-dead --help
...
```
<!-- usagestop -->

