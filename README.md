<p align="bottom">
<img align="left" src="https://user-images.githubusercontent.com/715967/191147173-5ca4b1b6-a07e-4873-866b-2d4fbb3b15dd.png" />
</p>

# Snlack!
_The Unofficial Snyk app for Slack_
<br /><br />


Snlack is intended as a developer demo with benefits. It's based roughly on [snyk-apps-demo](https://github.com/snyk/snyk-apps-demo) so if you're familiar with that repository you'll likely notice some common elements. The biggest departure from other integrations I've put together is that this one is actually follows the Snyk Apps design pattern rather than using tokens.

## Features

I've based things mostly around Slack's [Slash Commands](https://api.slack.com/interactivity/slash-commands) feature, treating `/snyk` as if it were a handy little CLI bin. 

*E.g. `/snyk org info Kuberneatos`, for information on my Snyk Organization "**Kuberneatos**."*

This means that there's at least a little bit of logical grouping under the hood, so it's quite easy to implement the various command outputs as responses to Slack UI events / user interactions.

For a good overview of what the App does today, check out the MVP Milestone [here](https://github.com/carwin/snlack/milestone/1).

If you're interested in contributing or just generally seeing where this might go, you can check in on the Project board [here](https://github.com/users/carwin/projects/2)

## Usage

You'll need to run / host this yourself if you want to make use of it.

**...More instructions coming soon.**
