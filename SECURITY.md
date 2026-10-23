# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 1.x | Yes: security fixes are released as 1.x patches |
| 0.x | No: upgrade to 1.x, as [MIGRATION.md](MIGRATION.md) explains |

## Reporting a vulnerability

Please do not open a public issue, pull request or discussion for a security problem.

Report it privately through GitHub's private vulnerability reporting: open [a new security advisory](https://github.com/AmineSeboui/quoin-editor/security/advisories/new) from the Security tab of the repository. Describe the problem, the version of `quoin-editor` it affects and the steps or the document that reproduce it, and, if you can, what an attacker could do with it.

You can expect an acknowledgement within a week. Once the problem is confirmed, a fix is prepared in the private advisory, released as a patch, and the advisory is published with credit to you unless you would rather not be named.

## What is in scope

Quoin runs inside the host's page and talks to no server of its own: the only request it makes itself is `toDocx` fetching the pictures it embeds, unless the host gives it a `fetchAsset` of its own. Reports that matter most are ones where content a writer or a collaborator controls can run script or reach an unexpected address in another user's page or file, for example through:

- markdown, pasted HTML or a shared document drawn by `BlockCanvas`, `QuoinView` or `QuoinDiff`, or written by `toHTML`;
- links and embeds, whose addresses Quoin filters before it draws or writes them;
- a Word file written by `toDocx`.

Functions the host passes in, such as `renderMath`, `highlight`, `upload`, `resolveAssetUrl` or an embed provider, are trusted host code. A problem that needs a malicious host function is out of scope, unless Quoin documents that it checks what that function returns.
