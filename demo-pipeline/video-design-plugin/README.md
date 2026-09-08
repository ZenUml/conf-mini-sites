# Mini Sites video-production plugin

This folder is the portable Open Design workflow definition for the Mini Sites
demo-video process. Open Design snapshots the manifest into a project, so later
edits here do not rewrite an in-progress video's workflow or approvals.

With the local Open Design daemon running, validate and install this exact
folder by absolute path:

```bash
od plugin validate /Users/pengxiao/workspaces/mini-sites/conf-mini-sites/demo-pipeline/video-design-plugin
od plugin install /Users/pengxiao/workspaces/mini-sites/conf-mini-sites/demo-pipeline/video-design-plugin
```

Create a `video` project with the installed
`mini-sites-video-production` scenario. The first migration fixture is:

- story: `demo-pipeline/stories/mini-site-launch.story.json`
- completed source run: `demo-pipeline/.demo-runs/task9-run1`

Importing this fixture computes new canonical revisions and starts with an empty
approval history. The old review-console event log and projection are not
inputs.
